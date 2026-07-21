package com.tripsync.trip;

import com.tripsync.user.User;
import com.tripsync.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Handles all itinerary-related endpoints:
 *   GET/POST  /trips/{tripId}/flights          — member arrival/departure info at destination
 *   GET/POST  /trips/{tripId}/accommodations   — where the group is staying
 *   DELETE    /trips/{tripId}/accommodations/{accId}
 *   GET/POST  /trips/{tripId}/itinerary        — day-by-day activity items
 *   DELETE    /trips/{tripId}/itinerary/{itemId}
 *   GET       /trips/{tripId}/itinerary/context — ideas sorted by votes (for itinerary generation)
 */
@RestController
@RequestMapping("/trips/{tripId}")
public class ItineraryController {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final TripFlightInfoRepository flightInfoRepository;
    private final TripAccommodationRepository accommodationRepository;
    private final TripItineraryItemRepository itineraryItemRepository;
    private final TripIdeaRepository ideaRepository;
    private final IdeaVoteRepository voteRepository;
    private final UserRepository userRepository;

    public ItineraryController(
            TripRepository tripRepository,
            TripMemberRepository tripMemberRepository,
            TripFlightInfoRepository flightInfoRepository,
            TripAccommodationRepository accommodationRepository,
            TripItineraryItemRepository itineraryItemRepository,
            TripIdeaRepository ideaRepository,
            IdeaVoteRepository voteRepository,
            UserRepository userRepository
    ) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.flightInfoRepository = flightInfoRepository;
        this.accommodationRepository = accommodationRepository;
        this.itineraryItemRepository = itineraryItemRepository;
        this.ideaRepository = ideaRepository;
        this.voteRepository = voteRepository;
        this.userRepository = userRepository;
    }

    // ========== Helpers ==========

    private User getCurrentUser() {
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }

    private TripMember getCurrentMember(Trip trip) {
        User user = getCurrentUser();
        if (user == null) return null;
        return tripMemberRepository.findByTripAndUser(trip, user).orElse(null);
    }

    private Trip requireTrip(Long tripId) {
        return tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));
    }

    // ========== DTOs ==========

    record FlightInfoRequest(
            String arrivalDatetime,
            String arrivalFlightNumber,
            String arrivalAirport,
            String departureDatetime,
            String departureFlightNumber,
            String departureAirport
    ) {}

    record FlightInfoResponse(
            Long id,
            Long memberId,
            String memberName,
            String arrivalDatetime,
            String arrivalFlightNumber,
            String arrivalAirport,
            String departureDatetime,
            String departureFlightNumber,
            String departureAirport
    ) {}

    record AccommodationRequest(
            String name,
            String address,
            String checkInDate,
            String checkInTime,
            String checkOutDate,
            String checkOutTime,
            String notes
    ) {}

    record AccommodationResponse(
            Long id,
            String name,
            String address,
            String checkInDate,
            String checkInTime,
            String checkOutDate,
            String checkOutTime,
            String notes
    ) {}

    record ItineraryItemRequest(
            String dayDate,
            String startTime,
            String endTime,
            String title,
            String description,
            String category,
            String location,
            String notes,
            Integer sortOrder,
            Integer travelTimeMinutes,
            Boolean isAiGenerated
    ) {}

    record ItineraryItemResponse(
            Long id,
            String dayDate,
            String startTime,
            String endTime,
            String title,
            String description,
            String category,
            String location,
            int sortOrder,
            String notes,
            Integer travelTimeMinutes,
            boolean isAiGenerated
    ) {}

    record ItineraryDayResponse(
            String date,
            String dayLabel,
            List<ItineraryItemResponse> items
    ) {}

    record IdeaContextItem(
            Long id,
            String title,
            String description,
            String category,
            int votes
    ) {}

    record ItineraryContextResponse(
            List<IdeaContextItem> ideas
    ) {}

    // ========== Flight Info Endpoints ==========

    /**
     * GET /trips/{tripId}/flights
     * Returns arrival/departure info for all members (used by Itinerary setup page).
     * Note: this is distinct from /trips/{tripId}/flights/selected (booked flights).
     */
    @GetMapping("/flights")
    public ResponseEntity<List<FlightInfoResponse>> getMemberFlights(@PathVariable Long tripId) {
        Trip trip = requireTrip(tripId);
        TripMember member = getCurrentMember(trip);
        if (member == null) return ResponseEntity.status(403).build();

        List<TripFlightInfo> infos = flightInfoRepository.findByTrip(trip);
        List<FlightInfoResponse> response = infos.stream()
                .map(fi -> new FlightInfoResponse(
                        fi.getId(),
                        fi.getMember().getId(),
                        fi.getMember().getDisplayName(),
                        fi.getArrivalDatetime(),
                        fi.getArrivalFlightNumber(),
                        fi.getArrivalAirport(),
                        fi.getDepartureDatetime(),
                        fi.getDepartureFlightNumber(),
                        fi.getDepartureAirport()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * POST /trips/{tripId}/flights
     * Saves or updates the current user's arrival/departure info.
     */
    @PostMapping("/flights")
    public ResponseEntity<FlightInfoResponse> saveMemberFlight(
            @PathVariable Long tripId,
            @RequestBody FlightInfoRequest request
    ) {
        Trip trip = requireTrip(tripId);
        TripMember member = getCurrentMember(trip);
        if (member == null) return ResponseEntity.status(403).build();

        TripFlightInfo info = flightInfoRepository.findByTripAndMember(trip, member)
                .orElseGet(() -> {
                    TripFlightInfo fi = new TripFlightInfo();
                    fi.setTrip(trip);
                    fi.setMember(member);
                    return fi;
                });

        info.setArrivalDatetime(request.arrivalDatetime());
        info.setArrivalFlightNumber(request.arrivalFlightNumber());
        info.setArrivalAirport(request.arrivalAirport());
        info.setDepartureDatetime(request.departureDatetime());
        info.setDepartureFlightNumber(request.departureFlightNumber());
        info.setDepartureAirport(request.departureAirport());

        info = flightInfoRepository.save(info);

        return ResponseEntity.ok(new FlightInfoResponse(
                info.getId(),
                member.getId(),
                member.getDisplayName(),
                info.getArrivalDatetime(),
                info.getArrivalFlightNumber(),
                info.getArrivalAirport(),
                info.getDepartureDatetime(),
                info.getDepartureFlightNumber(),
                info.getDepartureAirport()
        ));
    }

    // ========== Accommodation Endpoints ==========

    /**
     * GET /trips/{tripId}/accommodations
     */
    @GetMapping("/accommodations")
    public ResponseEntity<List<AccommodationResponse>> getAccommodations(@PathVariable Long tripId) {
        Trip trip = requireTrip(tripId);
        TripMember member = getCurrentMember(trip);
        if (member == null) return ResponseEntity.status(403).build();

        List<AccommodationResponse> response = accommodationRepository.findByTripOrderByCheckInDateAsc(trip)
                .stream()
                .map(a -> new AccommodationResponse(
                        a.getId(), a.getName(), a.getAddress(),
                        a.getCheckInDate(), a.getCheckInTime(),
                        a.getCheckOutDate(), a.getCheckOutTime(),
                        a.getNotes()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * POST /trips/{tripId}/accommodations
     */
    @PostMapping("/accommodations")
    public ResponseEntity<AccommodationResponse> addAccommodation(
            @PathVariable Long tripId,
            @RequestBody AccommodationRequest request
    ) {
        Trip trip = requireTrip(tripId);
        TripMember member = getCurrentMember(trip);
        if (member == null) return ResponseEntity.status(403).build();

        if (request.name() == null || request.name().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (request.address() == null || request.address().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        TripAccommodation acc = new TripAccommodation();
        acc.setTrip(trip);
        acc.setName(request.name().trim());
        acc.setAddress(request.address().trim());
        acc.setCheckInDate(request.checkInDate());
        acc.setCheckInTime(request.checkInTime());
        acc.setCheckOutDate(request.checkOutDate());
        acc.setCheckOutTime(request.checkOutTime());
        acc.setNotes(request.notes());

        acc = accommodationRepository.save(acc);

        return ResponseEntity.ok(new AccommodationResponse(
                acc.getId(), acc.getName(), acc.getAddress(),
                acc.getCheckInDate(), acc.getCheckInTime(),
                acc.getCheckOutDate(), acc.getCheckOutTime(),
                acc.getNotes()
        ));
    }

    /**
     * DELETE /trips/{tripId}/accommodations/{accId}
     */
    @DeleteMapping("/accommodations/{accId}")
    public ResponseEntity<Void> deleteAccommodation(
            @PathVariable Long tripId,
            @PathVariable Long accId
    ) {
        Trip trip = requireTrip(tripId);
        TripMember member = getCurrentMember(trip);
        if (member == null) return ResponseEntity.status(403).build();

        TripAccommodation acc = accommodationRepository.findById(accId)
                .orElseThrow(() -> new RuntimeException("Accommodation not found"));

        if (!acc.getTrip().getId().equals(trip.getId())) {
            return ResponseEntity.status(403).build();
        }

        accommodationRepository.delete(acc);
        return ResponseEntity.ok().build();
    }

    // ========== Itinerary Endpoints ==========

    /**
     * GET /trips/{tripId}/itinerary
     * Returns items grouped by day, sorted chronologically.
     */
    @GetMapping("/itinerary")
    public ResponseEntity<List<ItineraryDayResponse>> getItinerary(@PathVariable Long tripId) {
        Trip trip = requireTrip(tripId);
        TripMember member = getCurrentMember(trip);
        if (member == null) return ResponseEntity.status(403).build();

        List<TripItineraryItem> items = itineraryItemRepository
                .findByTripOrderByDayDateAscSortOrderAscStartTimeAsc(trip);

        // Group items by date
        LinkedHashMap<String, List<ItineraryItemResponse>> byDate = new LinkedHashMap<>();
        for (TripItineraryItem item : items) {
            byDate.computeIfAbsent(item.getDayDate(), k -> new ArrayList<>())
                    .add(toItemResponse(item));
        }

        // Build day responses with "Day 1", "Day 2" labels
        List<ItineraryDayResponse> days = new ArrayList<>();
        int dayNum = 1;
        for (Map.Entry<String, List<ItineraryItemResponse>> entry : byDate.entrySet()) {
            days.add(new ItineraryDayResponse(entry.getKey(), "Day " + dayNum, entry.getValue()));
            dayNum++;
        }

        return ResponseEntity.ok(days);
    }

    /**
     * POST /trips/{tripId}/itinerary
     * Adds a new activity to the itinerary.
     */
    @PostMapping("/itinerary")
    public ResponseEntity<ItineraryItemResponse> addItineraryItem(
            @PathVariable Long tripId,
            @RequestBody ItineraryItemRequest request
    ) {
        Trip trip = requireTrip(tripId);
        TripMember member = getCurrentMember(trip);
        if (member == null) return ResponseEntity.status(403).build();

        if (request.dayDate() == null || request.dayDate().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (request.title() == null || request.title().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        TripItineraryItem item = new TripItineraryItem();
        item.setTrip(trip);
        item.setDayDate(request.dayDate());
        item.setStartTime(request.startTime());
        item.setEndTime(request.endTime());
        item.setTitle(request.title().trim());
        item.setDescription(request.description());
        item.setCategory(request.category() != null ? request.category() : "activity");
        item.setLocation(request.location());
        item.setSortOrder(request.sortOrder() != null ? request.sortOrder() : 0);
        item.setNotes(request.notes());
        item.setTravelTimeMinutes(request.travelTimeMinutes());
        item.setAiGenerated(Boolean.TRUE.equals(request.isAiGenerated()));

        item = itineraryItemRepository.save(item);
        return ResponseEntity.ok(toItemResponse(item));
    }

    /**
     * DELETE /trips/{tripId}/itinerary/{itemId}
     */
    @DeleteMapping("/itinerary/{itemId}")
    public ResponseEntity<Void> deleteItineraryItem(
            @PathVariable Long tripId,
            @PathVariable Long itemId
    ) {
        Trip trip = requireTrip(tripId);
        TripMember member = getCurrentMember(trip);
        if (member == null) return ResponseEntity.status(403).build();

        TripItineraryItem item = itineraryItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        if (!item.getTrip().getId().equals(trip.getId())) {
            return ResponseEntity.status(403).build();
        }

        itineraryItemRepository.delete(item);
        return ResponseEntity.ok().build();
    }

    /**
     * GET /trips/{tripId}/itinerary/context
     * Returns ideas sorted by vote count (desc) — used by the itinerary generation feature.
     */
    @GetMapping("/itinerary/context")
    public ResponseEntity<ItineraryContextResponse> getItineraryContext(@PathVariable Long tripId) {
        Trip trip = requireTrip(tripId);
        TripMember member = getCurrentMember(trip);
        if (member == null) return ResponseEntity.status(403).build();

        List<TripIdea> ideas = ideaRepository.findByTripOrderByCreatedAtDesc(trip);

        List<IdeaContextItem> contextItems = ideas.stream()
                .map(idea -> {
                    int voteCount = voteRepository.findByIdea(idea).size();
                    return new IdeaContextItem(
                            idea.getId(),
                            idea.getTitle(),
                            idea.getDescription(),
                            idea.getCategory(),
                            voteCount
                    );
                })
                .sorted(Comparator.comparingInt(IdeaContextItem::votes).reversed())
                .collect(Collectors.toList());

        return ResponseEntity.ok(new ItineraryContextResponse(contextItems));
    }

    // ========== Private helper ==========

    private ItineraryItemResponse toItemResponse(TripItineraryItem item) {
        return new ItineraryItemResponse(
                item.getId(),
                item.getDayDate(),
                item.getStartTime(),
                item.getEndTime(),
                item.getTitle(),
                item.getDescription(),
                item.getCategory(),
                item.getLocation(),
                item.getSortOrder(),
                item.getNotes(),
                item.getTravelTimeMinutes(),
                item.isAiGenerated()
        );
    }
}
