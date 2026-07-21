package com.tripsync.trip;

import com.tripsync.user.User;
import com.tripsync.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/trips")
public class TripInsightsController {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final TripAvailabilityRepository availabilityRepository;
    private final TripBudgetRepository budgetRepository;
    private final SelectedFlightRepository selectedFlightRepository;
    private final UserRepository userRepository;

    @Value("${GROQ_API_KEY:}")
    private String groqApiKey;

    public TripInsightsController(
            TripRepository tripRepository,
            TripMemberRepository tripMemberRepository,
            TripAvailabilityRepository availabilityRepository,
            TripBudgetRepository budgetRepository,
            SelectedFlightRepository selectedFlightRepository,
            UserRepository userRepository) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.availabilityRepository = availabilityRepository;
        this.budgetRepository = budgetRepository;
        this.selectedFlightRepository = selectedFlightRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/{tripId}/ai-insights")
    public ResponseEntity<?> getInsights(@PathVariable Long tripId) {
        if (groqApiKey == null || groqApiKey.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "AI insights not configured — add GROQ_API_KEY to application-local.properties (free at console.groq.com)"));
        }

        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        List<TripMember> members = tripMemberRepository.findByTrip(trip);
        List<TripAvailability> availability = availabilityRepository.findByTrip(trip);
        List<TripBudget> budgets = budgetRepository.findByTrip(trip);
        List<SelectedFlight> flights = selectedFlightRepository.findByTrip(trip);

        String prompt = buildPrompt(trip, members, availability, budgets, flights);

        try {
            List<Map<String, String>> insights = callGroq(prompt);
            return ResponseEntity.ok(Map.of("insights", insights));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to generate insights: " + e.getMessage()));
        }
    }

    private String buildPrompt(Trip trip, List<TripMember> members,
                                List<TripAvailability> availability,
                                List<TripBudget> budgets,
                                List<SelectedFlight> flights) {

        int memberCount = members.size();
        String destination = (trip.getDestination() != null && !trip.getDestination().isBlank())
                ? trip.getDestination() : "undecided";

        Map<LocalDate, Long> availablePerDay = availability.stream()
                .filter(a -> a.getStatus() == AvailabilityStatus.AVAILABLE)
                .collect(Collectors.groupingBy(TripAvailability::getDate, Collectors.counting()));

        String availSummary;
        if (availablePerDay.isEmpty()) {
            availSummary = "No availability has been entered yet.";
        } else {
            String topDates = availablePerDay.entrySet().stream()
                    .sorted(Map.Entry.<LocalDate, Long>comparingByValue().reversed())
                    .limit(5)
                    .map(e -> e.getKey() + " (" + e.getValue() + "/" + memberCount + " available)")
                    .collect(Collectors.joining(", "));
            long maxAvail = availablePerDay.values().stream().mapToLong(l -> l).max().orElse(0);
            availSummary = "Best dates: " + topDates + ". Peak overlap: " + maxAvail + " of " + memberCount + " members.";
        }

        String budgetSummary;
        if (budgets.isEmpty()) {
            budgetSummary = "No budget set yet.";
        } else {
            budgetSummary = budgets.stream()
                    .map(b -> b.getCategory() + ": $" + b.getBudgetedAmount())
                    .collect(Collectors.joining(", "));
            double total = budgets.stream().mapToDouble(b -> b.getBudgetedAmount().doubleValue()).sum();
            budgetSummary += ". Total: $" + String.format("%.0f", total);
        }

        String flightSummary;
        if (flights.isEmpty()) {
            flightSummary = "No flights saved yet.";
        } else {
            long savedCount = flights.stream().map(SelectedFlight::getMember).distinct().count();
            double avgPrice = flights.stream().mapToDouble(f -> f.getPrice().doubleValue()).average().orElse(0);
            flightSummary = savedCount + " of " + memberCount + " members have saved flights. Avg price: $" + String.format("%.0f", avgPrice) + ".";
        }

        return """
                You are a smart travel planning assistant for a group trip app called TripSync.
                Analyze this trip data and generate exactly 4 short, friendly, actionable alerts.

                Trip: "%s" to %s
                Group size: %d travelers

                Availability: %s
                Budget: %s
                Flights: %s

                Return a JSON array of exactly 4 objects, each with:
                - "type": one of "availability", "budget", "flights", "tip"
                - "icon": a single relevant emoji
                - "title": short alert title (5-8 words)
                - "message": 1-2 sentence actionable insight

                Be specific with numbers from the data. If data is missing, give relevant planning advice.
                Return ONLY the JSON array, no other text.
                """.formatted(trip.getName(), destination, memberCount, availSummary, budgetSummary, flightSummary);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, String>> callGroq(String prompt) {
        RestTemplate rest = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        Map<String, Object> body = Map.of(
                "model", "llama-3.3-70b-versatile",
                "max_tokens", 1024,
                "messages", List.of(Map.of("role", "user", "content", prompt))
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = rest.postForEntity(
                "https://api.groq.com/openai/v1/chat/completions", request, Map.class);

        Map<String, Object> responseBody = response.getBody();
        List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        String text = (String) message.get("content");

        text = text.strip();
        if (text.startsWith("```")) {
            text = text.replaceAll("```json\\n?", "").replaceAll("```", "").strip();
        }

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        try {
            return mapper.readValue(text, mapper.getTypeFactory().constructCollectionType(List.class, Map.class));
        } catch (Exception e) {
            return List.of(Map.of(
                    "type", "tip",
                    "icon", "✨",
                    "title", "AI insights ready",
                    "message", text
            ));
        }
    }
}
