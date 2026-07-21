package com.tripsync.trip;

import com.tripsync.user.User;
import com.tripsync.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/invite")
public class InviteController {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final TripInviteRepository tripInviteRepository;
    private final UserRepository userRepository;

    public InviteController(TripRepository tripRepository,
                            TripMemberRepository tripMemberRepository,
                            TripInviteRepository tripInviteRepository,
                            UserRepository userRepository) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.tripInviteRepository = tripInviteRepository;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getPrincipal())) {
            throw new RuntimeException("No authenticated user");
        }

        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found for email: " + email));
    }

    public record GuestJoinRequest(String displayName, String homeAirport) {}
    public record InviteResponse(String code, Long tripId) {}
    public record InvitePreviewResponse(
            Long tripId,
            String tripName,
            String destination,
            String organizerName,
            int memberCount
    ) {}

    // 1) Generate an invite code (auth required)
    @PostMapping("/{tripId}/code")
    public ResponseEntity<InviteResponse> generateInviteCode(@PathVariable Long tripId) {
        User currentUser = getCurrentUser();

        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        // Allow any member of this trip to generate an invite
        Optional<TripMember> memberOpt =
                tripMemberRepository.findByTripAndUser(trip, currentUser);

        if (memberOpt.isEmpty()) {
            // not part of this trip at all
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Block pure guests from inviting
        TripMember member = memberOpt.get();
        if (member.isGuest()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String code = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        Instant now = Instant.now();
        Instant expiresAt = now.plus(30, ChronoUnit.DAYS);

        TripInvite invite = new TripInvite(
                null,
                trip,
                code,
                now,
                expiresAt
        );

        tripInviteRepository.save(invite);

        InviteResponse response = new InviteResponse(code, trip.getId());
        return ResponseEntity.ok(response);
    }


    // 2) Preview invite (no auth required)
    @GetMapping("/{code}/preview")
    public ResponseEntity<?> previewInvite(@PathVariable String code) {
        Optional<TripInvite> inviteOpt = tripInviteRepository.findByCode(code);
        if (inviteOpt.isEmpty() || inviteOpt.get().isExpired()) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "Invalid or expired invite code"));
        }

        TripInvite invite = inviteOpt.get();
        Trip trip = invite.getTrip();

        int memberCount = tripMemberRepository.countByTrip(trip);
        String organizerName = trip.getCreatedBy() != null
                ? trip.getCreatedBy().getDisplayName()
                : "Organizer";

        return ResponseEntity.ok(new InvitePreviewResponse(
                trip.getId(),
                trip.getName(),
                trip.getDestination(),
                organizerName,
                memberCount
        ));
    }

    // 3) Guest join via invite code (no auth required)
    @PostMapping("/{code}/join-guest")
    public ResponseEntity<?> joinAsGuest(@PathVariable String code,
                                         @RequestBody GuestJoinRequest request) {

        // If the user is already logged in, they should use the logged-in join flow
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() &&
                !"anonymousUser".equals(auth.getPrincipal())) {
            // Transparently treat this as a logged-in join
            return joinAsUser(code);
        }

        Optional<TripInvite> inviteOpt = tripInviteRepository.findByCode(code);
        if (inviteOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Invalid invite code"));
        }

        TripInvite invite = inviteOpt.get();
        if (invite.isExpired()) {
            return ResponseEntity.status(400).body(Map.of("error", "Invite expired"));
        }

        Trip trip = invite.getTrip();

        // Validate input
        if (request.displayName() == null || request.displayName().trim().isEmpty()) {
            return ResponseEntity.status(400).body(Map.of("error", "Name is required"));
        }
        if (request.homeAirport() == null || request.homeAirport().trim().isEmpty()) {
            return ResponseEntity.status(400).body(Map.of("error", "Airport is required"));
        }

        // Check if a guest with same name already exists in this trip
        List<TripMember> existingMembers = tripMemberRepository.findByTrip(trip);

        Optional<TripMember> existingGuestOpt = existingMembers.stream()
                .filter(m -> m.isGuest() &&
                        m.getDisplayName().equalsIgnoreCase(request.displayName().trim()))
                .findFirst();

        if (existingGuestOpt.isPresent()) {
            TripMember existingGuest = existingGuestOpt.get();

            // Reuse the existing guest instead of throwing 400
            return ResponseEntity.ok(Map.of(
                    "tripId", trip.getId(),
                    "memberId", existingGuest.getId(),
                    "guest", true,
                    "alreadyMember", true
            ));
        }

        TripMember member = new TripMember(
                null,
                trip,
                null,        // no user
                true,        // guest = true
                request.displayName().trim(),
                request.homeAirport().toUpperCase().trim(),
                Instant.now()
        );

        tripMemberRepository.save(member);

        return ResponseEntity.ok(Map.of(
                "tripId", trip.getId(),
                "memberId", member.getId(),
                "guest", true
        ));
    }

    // 4) Logged-in user join via invite code (auth required)
    @PostMapping("/{code}/join")
    public ResponseEntity<?> joinAsUser(@PathVariable String code) {
        User currentUser = getCurrentUser();

        Optional<TripInvite> inviteOpt = tripInviteRepository.findByCode(code);
        if (inviteOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Invalid invite code"));
        }

        TripInvite invite = inviteOpt.get();
        if (invite.isExpired()) {
            return ResponseEntity.status(400).body(Map.of("error", "Invite expired"));
        }

        Trip trip = invite.getTrip();

        // Check if user is already a member
        Optional<TripMember> existingMember = tripMemberRepository.findByTripAndUser(trip, currentUser);
        if (existingMember.isPresent()) {
            return ResponseEntity.ok(Map.of(
                    "tripId", trip.getId(),
                    "memberId", existingMember.get().getId(),
                    "alreadyMember", true,
                    "guest", false
            ));
        }

        TripMember member = new TripMember(
                null,
                trip,
                currentUser,
                false,       // guest = false (has account)
                currentUser.getDisplayName(),
                "UNKNOWN",   // they can set this later
                Instant.now()
        );

        tripMemberRepository.save(member);

        return ResponseEntity.ok(Map.of(
                "tripId", trip.getId(),
                "memberId", member.getId(),
                "guest", false
        ));
    }
}
