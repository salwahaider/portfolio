package com.tripsync.trip;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripsync.user.User;
import com.tripsync.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/trips/{tripId}/flights")
public class FlightSearchController {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final SelectedFlightRepository selectedFlightRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    // Reads from application-local.properties in dev, or SERPAPI_API_KEY env var in production
    @Value("${SERPAPI_API_KEY:${serpapi.api.key:}}")
    private String serpApiKey;

    private static final String SERPAPI_URL = "https://serpapi.com/search";
    private static final long CACHE_TTL_MS = 15 * 60 * 1000;

    private final ConcurrentHashMap<String, CachedResult> searchCache = new ConcurrentHashMap<>();

    public FlightSearchController(
            TripRepository tripRepository,
            TripMemberRepository tripMemberRepository,
            SelectedFlightRepository selectedFlightRepository,
            UserRepository userRepository
    ) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.selectedFlightRepository = selectedFlightRepository;
        this.userRepository = userRepository;
    }

    // ========== Helpers ==========

    private User getCurrentUser() {
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

    private TripMember getCurrentMember(Trip trip) {
        User user = getCurrentUser();
        return tripMemberRepository.findByTripAndUser(trip, user)
                .orElseThrow(() -> new RuntimeException("Not a member of this trip"));
    }

    // ========== DTOs ==========

    public record SearchRequest(
            String flyFrom,
            String flyTo,
            String dateFrom,        // YYYY-MM-DD
            String dateTo,          // YYYY-MM-DD (unused for SerpApi, kept for compat)
            Integer maxStopovers,
            String sort,
            Integer limit
    ) {}

    public record GroupSearchRequest(
            String flyTo,
            String dateFrom,        // YYYY-MM-DD outbound date
            String dateTo,          // YYYY-MM-DD (unused, kept for compat)
            String returnFrom,      // YYYY-MM-DD return date (optional)
            String returnTo,        // unused, kept for compat
            Integer maxStopovers,
            String sort,
            Integer arrivalWindowHours
    ) {}

    public record FlightResult(
            String id,
            String airline,
            String flightNumber,
            String departureAirport,
            String arrivalAirport,
            String departureCity,
            String arrivalCity,
            String departureTime,
            String arrivalTime,
            BigDecimal price,
            String currency,
            int stops,
            int durationMinutes,
            String bookingLink,
            String bookingToken,
            List<RouteSegment> segments
    ) {}

    public record RouteSegment(
            String airline,
            String flightNo,
            String fromAirport,
            String toAirport,
            String departure,
            String arrival
    ) {}

    public record MemberFlights(
            Long memberId,
            String memberName,
            String homeAirport,
            List<FlightResult> flights
    ) {}

    public record SyncedGroup(
            List<SyncedFlight> flights,
            BigDecimal totalPrice,
            long arrivalSpreadMinutes,
            String earliestArrival,
            String latestArrival
    ) {}

    public record SyncedFlight(
            Long memberId,
            String memberName,
            FlightResult flight
    ) {}

    public record GroupSearchResponse(
            List<MemberFlights> memberFlights,
            List<SyncedGroup> syncedGroups
    ) {}

    public record SelectFlightRequest(
            String direction,
            String airline,
            String flightNumber,
            String departureAirport,
            String arrivalAirport,
            String departureTime,
            String arrivalTime,
            BigDecimal price,
            String currency,
            int stops,
            int durationMinutes,
            String bookingLink
    ) {}

    public record SelectedFlightResponse(
            Long id,
            Long memberId,
            String memberName,
            String direction,
            String airline,
            String flightNumber,
            String departureAirport,
            String arrivalAirport,
            String departureTime,
            String arrivalTime,
            BigDecimal price,
            String currency,
            int stops,
            int durationMinutes,
            String bookingLink
    ) {}

    // ========== Cache ==========

    private record CachedResult(List<FlightResult> results, long timestamp) {}

    private String cacheKey(String from, String to, String date, Integer stops) {
        return from + "|" + to + "|" + date + "|" + stops;
    }

    // ========== SerpApi Google Flights ==========

    private List<FlightResult> searchFlightsViaApi(String departureId, String arrivalId,
                                                     String outboundDate, String returnDate,
                                                     Integer maxStopovers, String sort) {
        String key = cacheKey(departureId, arrivalId, outboundDate, maxStopovers);
        CachedResult cached = searchCache.get(key);
        if (cached != null && (System.currentTimeMillis() - cached.timestamp()) < CACHE_TTL_MS) {
            return cached.results();
        }

        try {
            StringBuilder url = new StringBuilder(SERPAPI_URL);
            url.append("?engine=google_flights");
            url.append("&departure_id=").append(enc(departureId));
            url.append("&arrival_id=").append(enc(arrivalId));
            url.append("&outbound_date=").append(enc(outboundDate));
            url.append("&type=2"); // one-way
            url.append("&currency=USD");
            url.append("&hl=en");
            url.append("&api_key=").append(enc(serpApiKey));

            if (returnDate != null && !returnDate.isBlank()) {
                // Switch to round trip
                url.replace(url.indexOf("&type=2"), url.indexOf("&type=2") + 7, "&type=1");
                url.append("&return_date=").append(enc(returnDate));
            }

            if (maxStopovers != null && maxStopovers >= 0) {
                // SerpApi stops: 1=nonstop, 2=1 stop or fewer, 3=2 stops or fewer
                int stopsParam = maxStopovers + 1;
                if (stopsParam <= 3) {
                    url.append("&stops=").append(stopsParam);
                }
            }

            if (sort != null) {
                switch (sort) {
                    case "price" -> url.append("&sort_by=2");
                    case "duration" -> url.append("&sort_by=5");
                    default -> url.append("&sort_by=1"); // "Top flights"
                }
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url.toString()))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                // Try to extract a meaningful error from SerpApi's JSON response
                String errorMsg = "Flight search failed (HTTP " + response.statusCode() + ")";
                try {
                    JsonNode errRoot = objectMapper.readTree(response.body());
                    if (errRoot.has("error")) {
                        errorMsg = errRoot.get("error").asText(errorMsg);
                    }
                } catch (Exception ignored) {}
                throw new RuntimeException(errorMsg);
            }

            JsonNode root = objectMapper.readTree(response.body());

            // SerpApi returns an "error" field even on 200 for some issues (e.g. no results, quota)
            if (root.has("error")) {
                throw new RuntimeException(root.get("error").asText("Flight search error"));
            }

            List<FlightResult> results = new ArrayList<>();

            // Parse best_flights
            JsonNode bestFlights = root.get("best_flights");
            if (bestFlights != null && bestFlights.isArray()) {
                for (JsonNode offer : bestFlights) {
                    FlightResult fr = parseGoogleFlightOffer(offer);
                    if (fr != null) results.add(fr);
                }
            }

            // Parse other_flights
            JsonNode otherFlights = root.get("other_flights");
            if (otherFlights != null && otherFlights.isArray()) {
                for (JsonNode offer : otherFlights) {
                    FlightResult fr = parseGoogleFlightOffer(offer);
                    if (fr != null) results.add(fr);
                }
            }

            searchCache.put(key, new CachedResult(results, System.currentTimeMillis()));
            return results;

        } catch (RuntimeException e) {
            // Re-throw meaningful errors (from our own checks above)
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Flight search failed: " + e.getMessage(), e);
        }
    }

    private FlightResult parseGoogleFlightOffer(JsonNode offer) {
        try {
            JsonNode flightsNode = offer.get("flights");
            if (flightsNode == null || !flightsNode.isArray() || flightsNode.isEmpty()) return null;

            List<RouteSegment> segments = new ArrayList<>();
            for (JsonNode seg : flightsNode) {
                JsonNode depAirport = seg.get("departure_airport");
                JsonNode arrAirport = seg.get("arrival_airport");

                segments.add(new RouteSegment(
                        textOrEmpty(seg, "airline"),
                        textOrEmpty(seg, "flight_number"),
                        depAirport != null ? textOrEmpty(depAirport, "id") : "",
                        arrAirport != null ? textOrEmpty(arrAirport, "id") : "",
                        depAirport != null ? textOrEmpty(depAirport, "time") : "",
                        arrAirport != null ? textOrEmpty(arrAirport, "time") : ""
                ));
            }

            // First segment = departure info, last segment = arrival info
            JsonNode firstFlight = flightsNode.get(0);
            JsonNode lastFlight = flightsNode.get(flightsNode.size() - 1);

            JsonNode firstDep = firstFlight.get("departure_airport");
            JsonNode lastArr = lastFlight.get("arrival_airport");

            String depAirportCode = firstDep != null ? textOrEmpty(firstDep, "id") : "";
            String arrAirportCode = lastArr != null ? textOrEmpty(lastArr, "id") : "";
            String depAirportName = firstDep != null ? textOrEmpty(firstDep, "name") : "";
            String arrAirportName = lastArr != null ? textOrEmpty(lastArr, "name") : "";
            String depTime = firstDep != null ? textOrEmpty(firstDep, "time") : "";
            String arrTime = lastArr != null ? textOrEmpty(lastArr, "time") : "";

            String airline = textOrEmpty(firstFlight, "airline");
            String flightNumber = textOrEmpty(firstFlight, "flight_number");

            int totalDuration = offer.has("total_duration") ? offer.get("total_duration").asInt(0) : 0;
            int price = offer.has("price") ? offer.get("price").asInt(0) : 0;
            int stops = segments.size() - 1;

            String id = depAirportCode + "-" + arrAirportCode + "-" + flightNumber + "-" + depTime;

            // Build a Google Flights deep link that pre-fills origin, destination and date
            // Format: https://www.google.com/travel/flights#flt=AUS.LAX.2026-07-15;c:USD;tt:o
            String dateStr = depTime.length() >= 10 ? depTime.substring(0, 10) : "";
            String bookingLink = "https://www.google.com/travel/flights#flt="
                    + depAirportCode + "." + arrAirportCode
                    + (dateStr.isEmpty() ? "" : "." + dateStr)
                    + ";c:USD;e:1;tt:o";
            String bookingToken = textOrEmpty(offer, "booking_token");

            return new FlightResult(
                    id,
                    airline,
                    flightNumber,
                    depAirportCode,
                    arrAirportCode,
                    depAirportName,
                    arrAirportName,
                    depTime,
                    arrTime,
                    BigDecimal.valueOf(price),
                    "USD",
                    stops,
                    totalDuration,
                    bookingLink,
                    bookingToken,
                    segments
            );
        } catch (Exception e) {
            return null;
        }
    }

    private String textOrEmpty(JsonNode node, String field) {
        JsonNode child = node.get(field);
        return (child != null && !child.isNull()) ? child.asText("") : "";
    }

    private String enc(String val) {
        return URLEncoder.encode(val, StandardCharsets.UTF_8);
    }

    // ========== Endpoints ==========

    @PostMapping("/search")
    public ResponseEntity<?> searchFlights(
            @PathVariable Long tripId,
            @RequestBody SearchRequest request
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));
        getCurrentMember(trip);

        if (serpApiKey == null || serpApiKey.isBlank()) {
            return ResponseEntity.badRequest().body("Flight search is not configured. Add a SerpApi key to application-local.properties.");
        }

        try {
            List<FlightResult> results = searchFlightsViaApi(
                    request.flyFrom(), request.flyTo(),
                    request.dateFrom(), null,
                    request.maxStopovers(), request.sort()
            );
            return ResponseEntity.ok(results);
        } catch (RuntimeException e) {
            return ResponseEntity.status(502).body(e.getMessage());
        }
    }

    @PostMapping("/search-group")
    public ResponseEntity<?> searchGroupFlights(
            @PathVariable Long tripId,
            @RequestBody GroupSearchRequest request
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));
        getCurrentMember(trip);

        if (serpApiKey == null || serpApiKey.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Flight search API key not configured"));
        }

        List<TripMember> members = tripMemberRepository.findByTrip(trip);
        List<MemberFlights> memberFlightsList = new ArrayList<>();
        List<String> searchErrors = new ArrayList<>();

        for (TripMember member : members) {
            String homeAirport = member.getHomeAirport();
            if (homeAirport == null || homeAirport.isBlank()) {
                memberFlightsList.add(new MemberFlights(
                        member.getId(), member.getDisplayName(), homeAirport, List.of()
                ));
                continue;
            }

            try {
                List<FlightResult> flights = searchFlightsViaApi(
                        homeAirport, request.flyTo(),
                        request.dateFrom(), request.returnFrom(),
                        request.maxStopovers(), request.sort()
                );
                memberFlightsList.add(new MemberFlights(
                        member.getId(), member.getDisplayName(), homeAirport, flights
                ));
            } catch (RuntimeException e) {
                // Record the error but keep searching for other members
                searchErrors.add(member.getDisplayName() + ": " + e.getMessage());
                memberFlightsList.add(new MemberFlights(
                        member.getId(), member.getDisplayName(), homeAirport, List.of()
                ));
            }
        }

        // If every member search failed, surface the error
        if (!searchErrors.isEmpty() && memberFlightsList.stream().allMatch(mf -> mf.flights().isEmpty())) {
            return ResponseEntity.status(502).body(String.join("; ", searchErrors));
        }

        int windowHours = request.arrivalWindowHours() != null ? request.arrivalWindowHours() : 2;
        List<SyncedGroup> syncedGroups = findSyncedArrivals(memberFlightsList, windowHours);

        return ResponseEntity.ok(new GroupSearchResponse(memberFlightsList, syncedGroups));
    }

    // ========== Booking Options ==========

    public record BookingOptionsRequest(String bookingToken) {}

    public record BookingOption(
            String bookWith,
            boolean isAirline,
            BigDecimal price,
            String currency,
            String bookingUrl,
            String postData,
            List<String> extensions
    ) {}

    @PostMapping("/booking-options")
    public ResponseEntity<?> getBookingOptions(
            @PathVariable Long tripId,
            @RequestBody BookingOptionsRequest request
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));
        getCurrentMember(trip);

        if (serpApiKey == null || serpApiKey.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "API key not configured"));
        }
        if (request.bookingToken() == null || request.bookingToken().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No booking token provided"));
        }

        try {
            String url = SERPAPI_URL
                    + "?engine=google_flights"
                    + "&booking_token=" + enc(request.bookingToken())
                    + "&currency=USD&hl=en"
                    + "&api_key=" + enc(serpApiKey);

            HttpRequest httpReq = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(httpReq, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) {
                return ResponseEntity.badRequest().body(Map.of("error", "Failed to fetch booking options"));
            }

            JsonNode root = objectMapper.readTree(resp.body());
            JsonNode bookingOptions = root.get("booking_options");

            List<BookingOption> options = new ArrayList<>();
            if (bookingOptions != null && bookingOptions.isArray()) {
                for (JsonNode opt : bookingOptions) {
                    JsonNode together = opt.get("together");
                    if (together == null) continue;

                    String bookWith = textOrEmpty(together, "book_with");
                    boolean isAirline = together.has("airline") && together.get("airline").asBoolean(false);
                    int optPrice = together.has("price") ? together.get("price").asInt(0) : 0;

                    String bookingUrl = "";
                    String postData = "";
                    JsonNode bookingReq = together.get("booking_request");
                    if (bookingReq != null) {
                        bookingUrl = textOrEmpty(bookingReq, "url");
                        postData = textOrEmpty(bookingReq, "post_data");
                    }

                    List<String> extensions = new ArrayList<>();
                    JsonNode ext = together.get("extensions");
                    if (ext != null && ext.isArray()) {
                        for (JsonNode e : ext) {
                            extensions.add(e.asText(""));
                        }
                    }

                    options.add(new BookingOption(
                            bookWith, isAirline, BigDecimal.valueOf(optPrice),
                            "USD", bookingUrl, postData, extensions
                    ));
                }
            }

            return ResponseEntity.ok(options);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to fetch booking options"));
        }
    }

    // ========== Synced Arrivals Algorithm ==========

    private List<SyncedGroup> findSyncedArrivals(List<MemberFlights> memberFlightsList, int windowHours) {
        List<MemberFlights> withFlights = memberFlightsList.stream()
                .filter(mf -> !mf.flights().isEmpty())
                .toList();

        if (withFlights.size() < 2) {
            return List.of();
        }

        List<List<FlightResult>> perMember = withFlights.stream()
                .map(mf -> mf.flights().stream().limit(10).toList())
                .toList();

        List<SyncedGroup> groups = new ArrayList<>();
        findCombinations(perMember, withFlights, 0, new ArrayList<>(), groups, windowHours);

        groups.sort(Comparator.comparing(SyncedGroup::totalPrice)
                .thenComparing(SyncedGroup::arrivalSpreadMinutes));

        return groups.stream().limit(5).toList();
    }

    private void findCombinations(
            List<List<FlightResult>> perMember,
            List<MemberFlights> memberInfo,
            int memberIdx,
            List<FlightResult> current,
            List<SyncedGroup> results,
            int windowHours
    ) {
        if (results.size() >= 50) return;

        if (memberIdx == perMember.size()) {
            List<Instant> arrivals = current.stream()
                    .map(f -> parseLocalDateTime(f.arrivalTime()))
                    .filter(Objects::nonNull)
                    .toList();

            if (arrivals.size() < 2) return;

            Instant earliest = arrivals.stream().min(Comparator.naturalOrder()).orElse(null);
            Instant latest = arrivals.stream().max(Comparator.naturalOrder()).orElse(null);
            if (earliest == null || latest == null) return;

            long spreadMinutes = ChronoUnit.MINUTES.between(earliest, latest);
            if (spreadMinutes <= windowHours * 60L) {
                BigDecimal totalPrice = current.stream()
                        .map(FlightResult::price)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                List<SyncedFlight> syncedFlights = new ArrayList<>();
                for (int i = 0; i < current.size(); i++) {
                    syncedFlights.add(new SyncedFlight(
                            memberInfo.get(i).memberId(),
                            memberInfo.get(i).memberName(),
                            current.get(i)
                    ));
                }

                results.add(new SyncedGroup(
                        syncedFlights,
                        totalPrice,
                        spreadMinutes,
                        earliest.toString(),
                        latest.toString()
                ));
            }
            return;
        }

        for (FlightResult flight : perMember.get(memberIdx)) {
            current.add(flight);
            findCombinations(perMember, memberInfo, memberIdx + 1, current, results, windowHours);
            current.remove(current.size() - 1);
        }
    }

    private Instant parseLocalDateTime(String dateTimeStr) {
        if (dateTimeStr == null || dateTimeStr.isBlank()) return null;
        try {
            // Google Flights format: "2026-03-18 10:30"
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
            LocalDateTime ldt = LocalDateTime.parse(dateTimeStr, fmt);
            return ldt.toInstant(ZoneOffset.UTC);
        } catch (Exception e1) {
            try {
                // Fallback: ISO format
                LocalDateTime ldt = LocalDateTime.parse(dateTimeStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                return ldt.toInstant(ZoneOffset.UTC);
            } catch (Exception e2) {
                return null;
            }
        }
    }

    // ========== Select / Selected / Delete ==========

    @PostMapping("/select")
    public ResponseEntity<?> selectFlight(
            @PathVariable Long tripId,
            @RequestBody SelectFlightRequest request
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));
        TripMember currentMember = getCurrentMember(trip);

        selectedFlightRepository.deleteByTripAndMemberAndDirection(trip, currentMember, request.direction());

        SelectedFlight sf = new SelectedFlight();
        sf.setTrip(trip);
        sf.setMember(currentMember);
        sf.setDirection(request.direction());
        sf.setAirline(request.airline());
        sf.setFlightNumber(request.flightNumber());
        sf.setDepartureAirport(request.departureAirport());
        sf.setArrivalAirport(request.arrivalAirport());
        sf.setDepartureTime(Instant.parse(request.departureTime()));
        sf.setArrivalTime(Instant.parse(request.arrivalTime()));
        sf.setPrice(request.price());
        sf.setCurrency(request.currency() != null ? request.currency() : "USD");
        sf.setStops(request.stops());
        sf.setDurationMinutes(request.durationMinutes());
        sf.setBookingLink(request.bookingLink());
        sf.setSavedAt(Instant.now());

        selectedFlightRepository.save(sf);

        return ResponseEntity.ok(Map.of("id", sf.getId(), "message", "Flight selected"));
    }

    @GetMapping("/selected")
    public ResponseEntity<List<SelectedFlightResponse>> getSelectedFlights(@PathVariable Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));
        getCurrentMember(trip);

        List<SelectedFlight> flights = selectedFlightRepository.findByTrip(trip);

        List<SelectedFlightResponse> response = flights.stream()
                .map(sf -> new SelectedFlightResponse(
                        sf.getId(),
                        sf.getMember().getId(),
                        sf.getMember().getDisplayName(),
                        sf.getDirection(),
                        sf.getAirline(),
                        sf.getFlightNumber(),
                        sf.getDepartureAirport(),
                        sf.getArrivalAirport(),
                        sf.getDepartureTime().toString(),
                        sf.getArrivalTime().toString(),
                        sf.getPrice(),
                        sf.getCurrency(),
                        sf.getStops(),
                        sf.getDurationMinutes(),
                        sf.getBookingLink()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/select/{direction}")
    public ResponseEntity<?> removeSelectedFlight(
            @PathVariable Long tripId,
            @PathVariable String direction
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));
        TripMember currentMember = getCurrentMember(trip);

        selectedFlightRepository.deleteByTripAndMemberAndDirection(trip, currentMember, direction);

        return ResponseEntity.ok(Map.of("message", "Flight selection removed"));
    }
}
