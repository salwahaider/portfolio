package com.tripsync.trip;

import com.tripsync.user.User;
import com.tripsync.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/trips")
public class TripController {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final UserRepository userRepository;

    public TripController(TripRepository tripRepository,
                          TripMemberRepository tripMemberRepository,
                          UserRepository userRepository) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.userRepository = userRepository;
    }

    /**
     * Get the currently authenticated User entity from the SecurityContext.
     * Returns null if not authenticated (for guest-friendly endpoints).
     */
    private User getCurrentUserOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }

        String email = auth.getName();
        return userRepository.findByEmail(email).orElse(null);
    }

    /**
     * Get the currently authenticated User entity.
     * Throws if not authenticated (for auth-required endpoints).
     */
    private User getCurrentUser() {
        User user = getCurrentUserOrNull();
        if (user == null) {
            throw new RuntimeException("No authenticated user");
        }
        return user;
    }

    // ==== DTOs ====

    public record CreateTripRequest(String name, String destination, String homeAirport) {}

    public record TripResponse(Long id, String name, String destination, String createdAtIso, String photoAlbumUrl) {}

    public record TripMemberResponse(
            Long id,
            String displayName,
            String homeAirport,
            boolean guest,
            boolean creator,
            boolean isCurrentUser
    ) {}

    public record UpdateMemberRequest(String homeAirport, String displayName) {}

    public record UpdateTripRequest(String name, String destination) {}

    // ==== Endpoints ====

    /**
     * Create a new trip and add the creator as a non-guest member.
     * (Auth required)
     */
    @PostMapping
    public ResponseEntity<TripResponse> createTrip(@RequestBody CreateTripRequest request) {
        User currentUser = getCurrentUser();

        Trip trip = new Trip(
                null,
                request.name(),
                request.destination() != null ? request.destination() : "",
                currentUser,
                Instant.now()
        );
        tripRepository.save(trip);

        TripMember creatorMember = new TripMember(
                null,
                trip,
                currentUser,
                false,
                currentUser.getDisplayName(),
                request.homeAirport(),
                Instant.now()
        );
        tripMemberRepository.save(creatorMember);

        String dest = trip.getDestination();
        TripResponse response = new TripResponse(
                trip.getId(),
                trip.getName(),
                dest != null && !dest.isEmpty() ? dest : null,
                trip.getCreatedAt().toString(),
                trip.getPhotoAlbumUrl()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * List trips where the current user is a member.
     * (Auth required)
     */
    @GetMapping
    public ResponseEntity<List<TripResponse>> listMyTrips() {
        User currentUser = getCurrentUser();

        List<Trip> trips = tripRepository.findAllForUser(currentUser);

        List<TripResponse> response = trips.stream()
                .map(t -> new TripResponse(
                        t.getId(),
                        t.getName(),
                        t.getDestination() != null && !t.getDestination().isEmpty() ? t.getDestination() : null,
                        t.getCreatedAt().toString(),
                        t.getPhotoAlbumUrl()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Get a single trip by ID.
     * (No auth required - guests can view trips they're members of)
     */
    @GetMapping("/{tripId}")
    public ResponseEntity<TripResponse> getTrip(@PathVariable Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripResponse response = new TripResponse(
                trip.getId(),
                trip.getName(),
                trip.getDestination(),
                trip.getCreatedAt().toString(),
                trip.getPhotoAlbumUrl()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Update a trip's name or destination.
     * Only authenticated members (non-guests) can update.
     */
    @PatchMapping("/{tripId}")
    public ResponseEntity<?> updateTrip(
            @PathVariable Long tripId,
            @RequestBody UpdateTripRequest request) {

        User currentUser = getCurrentUserOrNull();
        
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Must be logged in to edit trip"));
        }

        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        // Check if user is a member of this trip
        var memberOpt = tripMemberRepository.findByTripAndUser(trip, currentUser);
        if (memberOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You are not a member of this trip"));
        }

        // Only non-guest members can edit
        TripMember member = memberOpt.get();
        if (member.isGuest()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Guests cannot edit trip details"));
        }

        // Update fields if provided
        if (request.name() != null && !request.name().trim().isEmpty()) {
            trip.setName(request.name().trim());
        }
        if (request.destination() != null && !request.destination().trim().isEmpty()) {
            trip.setDestination(request.destination().trim());
        }

        tripRepository.save(trip);

        TripResponse response = new TripResponse(
                trip.getId(),
                trip.getName(),
                trip.getDestination(),
                trip.getCreatedAt().toString(),
                trip.getPhotoAlbumUrl()
        );

        return ResponseEntity.ok(response);
    }

    public record UpdatePhotoAlbumRequest(String photoAlbumUrl) {}

    /**
     * Set or update the shared photo album URL for a trip.
     * Any non-guest member can update this.
     */
    @PatchMapping("/{tripId}/photo-album")
    public ResponseEntity<?> updatePhotoAlbum(
            @PathVariable Long tripId,
            @RequestBody UpdatePhotoAlbumRequest request) {

        User currentUser = getCurrentUserOrNull();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Must be logged in"));
        }

        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        var memberOpt = tripMemberRepository.findByTripAndUser(trip, currentUser);
        if (memberOpt.isEmpty() || memberOpt.get().isGuest()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Members only"));
        }

        trip.setPhotoAlbumUrl(request.photoAlbumUrl());
        tripRepository.save(trip);

        return ResponseEntity.ok(Map.of("photoAlbumUrl", request.photoAlbumUrl() != null ? request.photoAlbumUrl() : ""));
    }

    /**
     * List all members for a given trip.
     * Supports both authenticated users and guests (via guestMemberId query param).
     * 
     * For logged-in users: uses their user ID to determine isCurrentUser
     * For guests: uses guestMemberId query param to determine isCurrentUser
     */
    @GetMapping("/{tripId}/members")
    public ResponseEntity<List<TripMemberResponse>> listMembers(
            @PathVariable Long tripId,
            @RequestParam(required = false) Long guestMemberId) {
        
        User currentUser = getCurrentUserOrNull();
        
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        List<TripMember> members = tripMemberRepository.findByTrip(trip);

        List<TripMemberResponse> response = members.stream()
                .map(m -> {
                    boolean isCreator = m.getUser() != null
                            && trip.getCreatedBy() != null
                            && trip.getCreatedBy().getId().equals(m.getUser().getId());

                    // Check if this member is the current user
                    // For logged-in users: match by user ID
                    // For guests: match by member ID (guestMemberId)
                    boolean isCurrentUser = false;
                    if (currentUser != null && m.getUser() != null) {
                        isCurrentUser = m.getUser().getId().equals(currentUser.getId());
                    } else if (guestMemberId != null) {
                        isCurrentUser = m.getId().equals(guestMemberId);
                    }

                    return new TripMemberResponse(
                            m.getId(),
                            m.getDisplayName(),
                            m.getHomeAirport(),
                            m.isGuest(),
                            isCreator,
                            isCurrentUser
                    );
                })
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Update a trip member's info (homeAirport, displayName).
     * Users can update their own record. Guests can update via guestMemberId.
     * Trip creator can update anyone.
     */
    @PatchMapping("/{tripId}/members/{memberId}")
    public ResponseEntity<?> updateMember(
            @PathVariable Long tripId,
            @PathVariable Long memberId,
            @RequestParam(required = false) Long guestMemberId,
            @RequestBody UpdateMemberRequest request) {

        User currentUser = getCurrentUserOrNull();

        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember member = tripMemberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("Member not found"));

        if (!member.getTrip().getId().equals(tripId)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Member does not belong to this trip"));
        }

        // Check permissions
        boolean isOwnRecord = false;
        boolean isCreator = false;
        
        if (currentUser != null) {
            // Logged-in user
            isOwnRecord = member.getUser() != null 
                    && member.getUser().getId().equals(currentUser.getId());
            isCreator = trip.getCreatedBy() != null 
                    && trip.getCreatedBy().getId().equals(currentUser.getId());
        } else if (guestMemberId != null) {
            // Guest user - can only update their own record
            isOwnRecord = member.getId().equals(guestMemberId);
        }

        if (!isOwnRecord && !isCreator) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You can only update your own member info"));
        }

        if (request.homeAirport() != null && !request.homeAirport().isBlank()) {
            member.setHomeAirport(request.homeAirport());
        }
        if (request.displayName() != null && !request.displayName().isBlank()) {
            member.setDisplayName(request.displayName());
        }

        tripMemberRepository.save(member);

        boolean memberIsCreator = member.getUser() != null
                && trip.getCreatedBy() != null
                && trip.getCreatedBy().getId().equals(member.getUser().getId());

        boolean memberIsCurrentUser = false;
        if (currentUser != null && member.getUser() != null) {
            memberIsCurrentUser = member.getUser().getId().equals(currentUser.getId());
        } else if (guestMemberId != null) {
            memberIsCurrentUser = member.getId().equals(guestMemberId);
        }

        TripMemberResponse response = new TripMemberResponse(
                member.getId(),
                member.getDisplayName(),
                member.getHomeAirport(),
                member.isGuest(),
                memberIsCreator,
                memberIsCurrentUser
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Delete a trip member. Only the trip creator can remove members.
     * (Auth required - only creator can delete)
     */
    @DeleteMapping("/{tripId}/members/{memberId}")
    public ResponseEntity<?> removeMember(
            @PathVariable Long tripId,
            @PathVariable Long memberId) {

        User currentUser = getCurrentUser();

        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember member = tripMemberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("Member not found"));

        if (!member.getTrip().getId().equals(tripId)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Member does not belong to this trip"));
        }

        boolean isCreator = trip.getCreatedBy() != null 
                && trip.getCreatedBy().getId().equals(currentUser.getId());

        if (!isCreator) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only the trip organizer can remove members"));
        }

        boolean isMemberTheCreator = member.getUser() != null
                && trip.getCreatedBy() != null
                && trip.getCreatedBy().getId().equals(member.getUser().getId());

        if (isMemberTheCreator) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "You cannot remove yourself as the trip organizer"));
        }

        tripMemberRepository.delete(member);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Member removed from trip"
        ));
    }
}
