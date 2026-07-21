package com.tripsync.trip;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/trips/{tripId}/hotels")
public class HotelSearchController {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${SERPAPI_API_KEY:${serpapi.api.key:}}")
    private String serpApiKey;

    private static final String SERPAPI_URL = "https://serpapi.com/search";
    private static final long CACHE_TTL_MS = 15 * 60 * 1000;

    private final ConcurrentHashMap<String, CachedResult> searchCache = new ConcurrentHashMap<>();
    private record CachedResult(List<HotelResult> results, long timestamp) {}

    public HotelSearchController(TripRepository tripRepository, TripMemberRepository tripMemberRepository) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record HotelSearchRequest(
            String query,       // e.g. "hotels in Paris" or destination name
            String checkIn,     // YYYY-MM-DD
            String checkOut,    // YYYY-MM-DD
            Integer adults      // defaults to 2
    ) {}

    public record HotelResult(
            String name,
            String description,
            String link,
            String thumbnail,
            Double rating,
            Integer reviewCount,
            String hotelClass,
            Double pricePerNight,    // extracted numeric, USD
            String priceDisplay,     // e.g. "$120"
            Double totalPrice,
            String totalPriceDisplay,
            List<String> amenities,
            List<String> essentialInfo,
            String checkInTime,
            String checkOutTime,
            Double latitude,
            Double longitude
    ) {}

    // ── Endpoint ──────────────────────────────────────────────────────────────

    @PostMapping("/search")
    public ResponseEntity<?> searchHotels(
            @PathVariable Long tripId,
            @RequestBody HotelSearchRequest request
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        // Must be a trip member (authenticated)
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).body(Map.of("error", "Sign in to search hotels"));
        }

        if (serpApiKey == null || serpApiKey.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Hotel search is not configured (missing SerpApi key)"));
        }

        if (request.query() == null || request.query().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Please enter a search query"));
        }

        String cacheKey = request.query() + "|" + request.checkIn() + "|" + request.checkOut()
                + "|" + request.adults();
        CachedResult cached = searchCache.get(cacheKey);
        if (cached != null && System.currentTimeMillis() - cached.timestamp() < CACHE_TTL_MS) {
            return ResponseEntity.ok(cached.results());
        }

        try {
            StringBuilder url = new StringBuilder(SERPAPI_URL);
            url.append("?engine=google_hotels");
            url.append("&q=").append(enc(request.query()));
            url.append("&currency=USD&hl=en");
            url.append("&api_key=").append(enc(serpApiKey));

            if (request.checkIn() != null && !request.checkIn().isBlank()) {
                url.append("&check_in_date=").append(enc(request.checkIn()));
            }
            if (request.checkOut() != null && !request.checkOut().isBlank()) {
                url.append("&check_out_date=").append(enc(request.checkOut()));
            }
            int adults = request.adults() != null && request.adults() > 0 ? request.adults() : 2;
            url.append("&adults=").append(adults);

            HttpRequest httpReq = HttpRequest.newBuilder()
                    .uri(URI.create(url.toString()))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(httpReq, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() != 200) {
                String errorMsg = "Hotel search failed (HTTP " + resp.statusCode() + ")";
                try {
                    JsonNode errRoot = objectMapper.readTree(resp.body());
                    if (errRoot.has("error")) errorMsg = errRoot.get("error").asText(errorMsg);
                } catch (Exception ignored) {}
                return ResponseEntity.status(502).body(Map.of("error", errorMsg));
            }

            JsonNode root = objectMapper.readTree(resp.body());

            if (root.has("error")) {
                return ResponseEntity.status(502).body(Map.of("error", root.get("error").asText("Hotel search error")));
            }

            List<HotelResult> results = new ArrayList<>();
            JsonNode properties = root.get("properties");
            if (properties != null && properties.isArray()) {
                for (JsonNode prop : properties) {
                    HotelResult hotel = parseHotel(prop);
                    if (hotel != null) results.add(hotel);
                    if (results.size() >= 20) break;
                }
            }

            searchCache.put(cacheKey, new CachedResult(results, System.currentTimeMillis()));
            return ResponseEntity.ok(results);

        } catch (RuntimeException e) {
            return ResponseEntity.status(502).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "Hotel search failed: " + e.getMessage()));
        }
    }

    // ── Parsing ───────────────────────────────────────────────────────────────

    private HotelResult parseHotel(JsonNode prop) {
        try {
            String name = text(prop, "name");
            if (name == null || name.isBlank()) return null;

            String description = text(prop, "description");
            String link = text(prop, "link");
            String thumbnail = text(prop, "thumbnail");
            String hotelClass = text(prop, "hotel_class");

            Double rating = prop.has("overall_rating") && !prop.get("overall_rating").isNull()
                    ? prop.get("overall_rating").asDouble() : null;
            Integer reviewCount = prop.has("reviews") && !prop.get("reviews").isNull()
                    ? prop.get("reviews").asInt() : null;

            // Price per night
            Double pricePerNight = null;
            String priceDisplay = null;
            JsonNode rateNode = prop.get("rate_per_night");
            if (rateNode != null) {
                if (rateNode.has("extracted_lowest")) {
                    pricePerNight = rateNode.get("extracted_lowest").asDouble();
                }
                priceDisplay = text(rateNode, "lowest");
            }

            // Total price
            Double totalPrice = null;
            String totalPriceDisplay = null;
            JsonNode totalNode = prop.get("total_rate");
            if (totalNode != null) {
                if (totalNode.has("extracted_lowest")) {
                    totalPrice = totalNode.get("extracted_lowest").asDouble();
                }
                totalPriceDisplay = text(totalNode, "lowest");
            }

            // Amenities
            List<String> amenities = new ArrayList<>();
            JsonNode amenNode = prop.get("amenities");
            if (amenNode != null && amenNode.isArray()) {
                for (JsonNode a : amenNode) {
                    amenities.add(a.asText());
                    if (amenities.size() >= 8) break;
                }
            }

            // Essential info (free cancellation, etc.)
            List<String> essentialInfo = new ArrayList<>();
            JsonNode essNode = prop.get("essential_info");
            if (essNode != null && essNode.isArray()) {
                for (JsonNode e : essNode) {
                    essentialInfo.add(e.asText());
                }
            }

            String checkInTime = text(prop, "check_in_time");
            String checkOutTime = text(prop, "check_out_time");

            Double lat = null;
            Double lng = null;
            JsonNode gps = prop.get("gps_coordinates");
            if (gps != null) {
                if (gps.has("latitude")) lat = gps.get("latitude").asDouble();
                if (gps.has("longitude")) lng = gps.get("longitude").asDouble();
            }

            return new HotelResult(
                    name, description, link, thumbnail,
                    rating, reviewCount, hotelClass,
                    pricePerNight, priceDisplay, totalPrice, totalPriceDisplay,
                    amenities, essentialInfo,
                    checkInTime, checkOutTime,
                    lat, lng
            );
        } catch (Exception e) {
            return null;
        }
    }

    private String text(JsonNode node, String field) {
        JsonNode child = node.get(field);
        return (child != null && !child.isNull()) ? child.asText(null) : null;
    }

    private String enc(String val) {
        return URLEncoder.encode(val, StandardCharsets.UTF_8);
    }
}
