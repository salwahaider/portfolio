// src/main/java/com/tripsync/trip/TripDestinationController.java
package com.tripsync.trip;

import com.tripsync.user.User;
import com.tripsync.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/trips/{tripId}/destinations")
public class TripDestinationController {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final TripDestinationRepository destinationRepository;
    private final DestinationVoteRepository voteRepository;
    private final UserRepository userRepository;

    public TripDestinationController(
            TripRepository tripRepository,
            TripMemberRepository tripMemberRepository,
            TripDestinationRepository destinationRepository,
            DestinationVoteRepository voteRepository,
            UserRepository userRepository
    ) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.destinationRepository = destinationRepository;
        this.voteRepository = voteRepository;
        this.userRepository = userRepository;
    }

    // ========== Helper Methods ==========

    /**
     * Resolves the current member from either:
     * 1. The authenticated user (JWT token)
     * 2. A guest member ID (for users who joined via invite link without an account)
     * Returns null if neither is available.
     */
    private TripMember resolveCurrentMember(Trip trip, Long guestMemberId) {
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated()
                && !"anonymousUser".equals(auth.getPrincipal())) {
            String email = auth.getName();
            var userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                return tripMemberRepository.findByTripAndUser(trip, userOpt.get()).orElse(null);
            }
        }

        if (guestMemberId != null) {
            return tripMemberRepository.findById(guestMemberId)
                    .filter(m -> m.getTrip().getId().equals(trip.getId()))
                    .orElse(null);
        }

        return null;
    }

    // ========== DTOs ==========

    public record AddDestinationRequest(
            String name,
            String label,
            String emoji,
            String priceTag
    ) {}

    public record DestinationResponse(
            Long id,
            String name,
            String label,
            String emoji,
            String priceTag,
            int votes,
            List<String> voters,
            boolean hasVoted,
            String addedBy,
            boolean canDelete
    ) {}

    // ========== Endpoints ==========

    /**
     * GET /trips/{tripId}/destinations
     * Returns all destinations for a trip with vote counts.
     * Supports both authenticated users and guests (via guestMemberId query param).
     */
    @GetMapping
    public List<DestinationResponse> getDestinations(
            @PathVariable Long tripId,
            @RequestParam(required = false) Long guestMemberId
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember currentMember = resolveCurrentMember(trip, guestMemberId);

        List<TripDestination> destinations = destinationRepository.findByTripOrderByCreatedAtDesc(trip);

        return destinations.stream().map(dest -> {
            List<DestinationVote> votes = voteRepository.findByDestination(dest);

            List<String> voterInitials = votes.stream()
                    .map(v -> {
                        String name = v.getMember().getDisplayName();
                        return (name != null && !name.isBlank())
                                ? name.substring(0, 1).toUpperCase()
                                : "?";
                    })
                    .collect(Collectors.toList());

            boolean hasVoted = currentMember != null && votes.stream()
                    .anyMatch(v -> v.getMember().getId().equals(currentMember.getId()));

            String addedByName = dest.getAddedBy() != null
                    ? dest.getAddedBy().getDisplayName()
                    : "Unknown";

            boolean isCreator = currentMember != null
                    && trip.getCreatedBy() != null
                    && currentMember.getUser() != null
                    && trip.getCreatedBy().getId().equals(currentMember.getUser().getId());

            boolean canDelete = currentMember != null && (
                    (dest.getAddedBy() != null && dest.getAddedBy().getId().equals(currentMember.getId()))
                    || isCreator);

            return new DestinationResponse(
                    dest.getId(),
                    dest.getName(),
                    dest.getLabel(),
                    dest.getEmoji(),
                    dest.getPriceTag(),
                    votes.size(),
                    voterInitials,
                    hasVoted,
                    addedByName,
                    canDelete
            );
        }).collect(Collectors.toList());
    }

    /**
     * POST /trips/{tripId}/destinations
     * Add a new destination suggestion.
     * Supports guests via guestMemberId query param.
     */
    @PostMapping
    public ResponseEntity<?> addDestination(
            @PathVariable Long tripId,
            @RequestParam(required = false) Long guestMemberId,
            @RequestBody AddDestinationRequest request
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember currentMember = resolveCurrentMember(trip, guestMemberId);
        if (currentMember == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Must be a trip member to add destinations"));
        }

        if (request.name() == null || request.name().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Destination name is required"));
        }

        TripDestination destination = new TripDestination(
                trip,
                request.name().trim(),
                request.label() != null ? request.label().trim() : null,
                request.emoji() != null ? request.emoji().trim() : "📍",
                request.priceTag() != null ? request.priceTag().trim() : null,
                currentMember
        );

        destinationRepository.save(destination);

        DestinationVote vote = new DestinationVote(destination, currentMember);
        voteRepository.save(vote);

        return ResponseEntity.ok(Map.of(
                "id", destination.getId(),
                "message", "Destination added"
        ));
    }

    /**
     * POST /trips/{tripId}/destinations/{destinationId}/vote
     * Toggle vote for a destination.
     * Supports guests via guestMemberId query param.
     */
    @PostMapping("/{destinationId}/vote")
    public ResponseEntity<?> toggleVote(
            @PathVariable Long tripId,
            @PathVariable Long destinationId,
            @RequestParam(required = false) Long guestMemberId
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember currentMember = resolveCurrentMember(trip, guestMemberId);
        if (currentMember == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Must be a trip member to vote"));
        }

        TripDestination destination = destinationRepository.findById(destinationId)
                .orElseThrow(() -> new RuntimeException("Destination not found"));

        if (!destination.getTrip().getId().equals(tripId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Destination not in this trip"));
        }

        Optional<DestinationVote> existingVote =
                voteRepository.findByDestinationAndMember(destination, currentMember);

        if (existingVote.isPresent()) {
            voteRepository.delete(existingVote.get());
            long newCount = voteRepository.countByDestination(destination);
            return ResponseEntity.ok(Map.of("voted", false, "votes", newCount));
        } else {
            DestinationVote vote = new DestinationVote(destination, currentMember);
            voteRepository.save(vote);
            long newCount = voteRepository.countByDestination(destination);
            return ResponseEntity.ok(Map.of("voted", true, "votes", newCount));
        }
    }

    /**
     * DELETE /trips/{tripId}/destinations/{destinationId}
     * Delete a destination (only by creator or person who added it).
     */
    @DeleteMapping("/{destinationId}")
    public ResponseEntity<?> deleteDestination(
            @PathVariable Long tripId,
            @PathVariable Long destinationId
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember currentMember = resolveCurrentMember(trip, null);
        if (currentMember == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Must be logged in to delete destinations"));
        }

        TripDestination destination = destinationRepository.findById(destinationId)
                .orElseThrow(() -> new RuntimeException("Destination not found"));

        if (!destination.getTrip().getId().equals(tripId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Destination not in this trip"));
        }

        boolean isAdder = destination.getAddedBy() != null &&
                destination.getAddedBy().getId().equals(currentMember.getId());

        boolean isCreator = trip.getCreatedBy() != null
                && currentMember.getUser() != null
                && trip.getCreatedBy().getId().equals(currentMember.getUser().getId());

        if (!isAdder && !isCreator) {
            return ResponseEntity.status(403)
                    .body(Map.of("error", "Only the person who added this or the trip creator can delete it"));
        }

        voteRepository.deleteByDestination(destination);
        destinationRepository.delete(destination);

        return ResponseEntity.ok(Map.of("message", "Destination deleted"));
    }
}
