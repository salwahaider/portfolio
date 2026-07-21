// src/main/java/com/tripsync/trip/TripIdeasController.java
package com.tripsync.trip;

import com.tripsync.user.User;
import com.tripsync.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/trips/{tripId}/ideas")
public class TripIdeasController {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final TripIdeaRepository ideaRepository;
    private final IdeaVoteRepository voteRepository;
    private final UserRepository userRepository;

    public TripIdeasController(
            TripRepository tripRepository,
            TripMemberRepository tripMemberRepository,
            TripIdeaRepository ideaRepository,
            IdeaVoteRepository voteRepository,
            UserRepository userRepository
    ) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.ideaRepository = ideaRepository;
        this.voteRepository = voteRepository;
        this.userRepository = userRepository;
    }

    // ========== Helper Methods ==========

    private User getCurrentUser() {
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }

        String email = auth.getName();
        return userRepository.findByEmail(email).orElse(null);
    }

    private TripMember getCurrentMember(Trip trip) {
        User user = getCurrentUser();
        if (user == null) return null;
        return tripMemberRepository.findByTripAndUser(trip, user).orElse(null);
    }

    // ========== DTOs ==========

    record AddIdeaRequest(
        String title,
        String description,
        String category,
        String link
    ) {}

    record IdeaResponse(
        Long id,
        String title,
        String description,
        String category,
        String link,
        String addedByName,
        Long addedById,
        int voteCount,
        boolean userVoted,
        List<String> voters,
        String createdAt
    ) {}

    // ========== Endpoints ==========

    /**
     * GET /trips/{tripId}/ideas
     * List all ideas for a trip
     */
    @GetMapping
    public ResponseEntity<List<IdeaResponse>> listIdeas(@PathVariable Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember currentMember = getCurrentMember(trip);

        List<TripIdea> ideas = ideaRepository.findByTripOrderByCreatedAtDesc(trip);

        List<IdeaResponse> response = ideas.stream().map(idea -> {
            List<IdeaVote> votes = voteRepository.findByIdea(idea);
            boolean userVoted = currentMember != null && 
                votes.stream().anyMatch(v -> v.getMember().getId().equals(currentMember.getId()));
            
            List<String> voterNames = votes.stream()
                .map(v -> v.getMember().getDisplayName())
                .collect(Collectors.toList());

            return new IdeaResponse(
                idea.getId(),
                idea.getTitle(),
                idea.getDescription(),
                idea.getCategory(),
                idea.getLink(),
                idea.getAddedBy().getDisplayName(),
                idea.getAddedBy().getId(),
                votes.size(),
                userVoted,
                voterNames,
                idea.getCreatedAt().toString()
            );
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * POST /trips/{tripId}/ideas
     * Add a new idea
     */
    @PostMapping
    public ResponseEntity<IdeaResponse> addIdea(
            @PathVariable Long tripId,
            @RequestBody AddIdeaRequest request
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember member = getCurrentMember(trip);
        if (member == null) {
            return ResponseEntity.status(403).build();
        }

        TripIdea idea = new TripIdea();
        idea.setTrip(trip);
        idea.setTitle(request.title());
        idea.setDescription(request.description());
        idea.setCategory(request.category() != null ? request.category() : "other");
        idea.setLink(request.link());
        idea.setAddedBy(member);

        idea = ideaRepository.save(idea);

        // Auto-vote for your own idea
        IdeaVote vote = new IdeaVote();
        vote.setIdea(idea);
        vote.setMember(member);
        voteRepository.save(vote);

        return ResponseEntity.ok(new IdeaResponse(
            idea.getId(),
            idea.getTitle(),
            idea.getDescription(),
            idea.getCategory(),
            idea.getLink(),
            member.getDisplayName(),
            member.getId(),
            1, // auto-voted
            true,
            List.of(member.getDisplayName()),
            idea.getCreatedAt().toString()
        ));
    }

    /**
     * DELETE /trips/{tripId}/ideas/{ideaId}
     * Delete an idea (only by person who added it)
     */
    @DeleteMapping("/{ideaId}")
    public ResponseEntity<Void> deleteIdea(
            @PathVariable Long tripId,
            @PathVariable Long ideaId
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember member = getCurrentMember(trip);
        if (member == null) {
            return ResponseEntity.status(403).build();
        }

        TripIdea idea = ideaRepository.findById(ideaId)
                .orElseThrow(() -> new RuntimeException("Idea not found"));

        // Only the person who added it can delete
        if (!idea.getAddedBy().getId().equals(member.getId())) {
            return ResponseEntity.status(403).build();
        }

        // Delete all votes first
        voteRepository.deleteByIdea(idea);
        ideaRepository.delete(idea);

        return ResponseEntity.ok().build();
    }

    /**
     * POST /trips/{tripId}/ideas/{ideaId}/vote
     * Vote for an idea
     */
    @PostMapping("/{ideaId}/vote")
    public ResponseEntity<Void> voteForIdea(
            @PathVariable Long tripId,
            @PathVariable Long ideaId
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember member = getCurrentMember(trip);
        if (member == null) {
            return ResponseEntity.status(403).build();
        }

        TripIdea idea = ideaRepository.findById(ideaId)
                .orElseThrow(() -> new RuntimeException("Idea not found"));

        // Check if already voted
        if (voteRepository.existsByIdeaAndMember(idea, member)) {
            return ResponseEntity.ok().build(); // Already voted, no-op
        }

        IdeaVote vote = new IdeaVote();
        vote.setIdea(idea);
        vote.setMember(member);
        voteRepository.save(vote);

        return ResponseEntity.ok().build();
    }

    /**
     * DELETE /trips/{tripId}/ideas/{ideaId}/vote
     * Remove vote from an idea
     */
    @DeleteMapping("/{ideaId}/vote")
    public ResponseEntity<Void> unvoteIdea(
            @PathVariable Long tripId,
            @PathVariable Long ideaId
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember member = getCurrentMember(trip);
        if (member == null) {
            return ResponseEntity.status(403).build();
        }

        TripIdea idea = ideaRepository.findById(ideaId)
                .orElseThrow(() -> new RuntimeException("Idea not found"));

        voteRepository.deleteByIdeaAndMember(idea, member);

        return ResponseEntity.ok().build();
    }
}
