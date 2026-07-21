package com.tripsync.trip;

import com.tripsync.user.User;
import com.tripsync.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

import static com.tripsync.trip.AvailabilityStatus.*;

@RestController
@RequestMapping("/trips/{tripId}/availability")
public class TripAvailabilityController {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final TripAvailabilityRepository availabilityRepository;
    private final UserRepository userRepository;

    public TripAvailabilityController(
            TripRepository tripRepository,
            TripMemberRepository tripMemberRepository,
            TripAvailabilityRepository availabilityRepository,
            UserRepository userRepository
    ) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.availabilityRepository = availabilityRepository;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        // same helper as InviteController#getCurrentUser
        // (you can extract this to a shared component if you want)
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getPrincipal())) {
            throw new RuntimeException("No authenticated user");
        }

        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public record AvailabilityEntry(String date, AvailabilityStatus status) {}

    public record SaveAvailabilityRequest(List<AvailabilityEntry> entries) {}

    public record MyAvailabilityResponse(List<AvailabilityEntry> entries) {}

    public record GroupDateSummary(
            String date,
            List<String> available,
            List<String> maybe,
            List<String> unavailable
    ) {}

    // GET /trips/{tripId}/availability/me
    @GetMapping("/me")
    public MyAvailabilityResponse getMyAvailability(@PathVariable Long tripId) {
        User user = getCurrentUser();
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember member = tripMemberRepository.findByTripAndUser(trip, user)
                .orElseThrow(() -> new RuntimeException("Not a member of this trip"));

        List<TripAvailability> rows =
                availabilityRepository.findByTripAndMember(trip, member);

        List<AvailabilityEntry> entries = rows.stream()
                .map(a -> new AvailabilityEntry(a.getDate().toString(), a.getStatus()))
                .toList();

        return new MyAvailabilityResponse(entries);
    }

    // PUT /trips/{tripId}/availability/me
    @PutMapping("/me")
    public ResponseEntity<?> saveMyAvailability(
            @PathVariable Long tripId,
            @RequestBody SaveAvailabilityRequest request
    ) {
        User user = getCurrentUser();
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember member = tripMemberRepository.findByTripAndUser(trip, user)
                .orElseThrow(() -> new RuntimeException("Not a member of this trip"));

        // simple approach: wipe & reinsert for this member
        availabilityRepository.deleteByTripAndMember(trip, member);

        if (request.entries() != null) {
            for (AvailabilityEntry entry : request.entries()) {
                LocalDate date = LocalDate.parse(entry.date());
                TripAvailability row = new TripAvailability();
                row.setTrip(trip);
                row.setMember(member);
                row.setDate(date);
                row.setStatus(entry.status());
                row.setCreatedAt(java.time.Instant.now());
                row.setUpdatedAt(java.time.Instant.now());
                availabilityRepository.save(row);
            }
        }

        return ResponseEntity.ok().build();
    }

    // GET /trips/{tripId}/availability/group
    @GetMapping("/group")
    public List<GroupDateSummary> getGroupAvailability(@PathVariable Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        List<TripAvailability> rows = availabilityRepository.findByTrip(trip);

        // Map member -> initial
        Map<Long, String> initials = tripMemberRepository.findByTrip(trip).stream()
                .collect(Collectors.toMap(
                        TripMember::getId,
                        m -> m.getDisplayName() != null && !m.getDisplayName().isBlank()
                                ? m.getDisplayName().trim().substring(0, 1).toUpperCase()
                                : "?"
                ));

        Map<String, GroupDateSummary> byDate = new HashMap<>();

        for (TripAvailability a : rows) {
            String date = a.getDate().toString();
            String initial = initials.getOrDefault(a.getMember().getId(), "?");

            GroupDateSummary existing = byDate.get(date);
            if (existing == null) {
                existing = new GroupDateSummary(
                        date, new ArrayList<>(), new ArrayList<>(), new ArrayList<>());
                byDate.put(date, existing);
            }

            switch (a.getStatus()) {
                case AVAILABLE -> ((List<String>) existing.available()).add(initial);
                case MAYBE -> ((List<String>) existing.maybe()).add(initial);
                case UNAVAILABLE -> ((List<String>) existing.unavailable()).add(initial);
            }
        }

        return new ArrayList<>(byDate.values());
    }
}
