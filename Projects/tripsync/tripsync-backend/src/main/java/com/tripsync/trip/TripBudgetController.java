// src/main/java/com/tripsync/trip/TripBudgetController.java
package com.tripsync.trip;

import com.tripsync.user.User;
import com.tripsync.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/trips/{tripId}")
public class TripBudgetController {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final TripBudgetRepository budgetRepository;
    private final TripExpenseRepository expenseRepository;
    private final ExpenseSplitRepository splitRepository;
    private final UserRepository userRepository;

    public TripBudgetController(
            TripRepository tripRepository,
            TripMemberRepository tripMemberRepository,
            TripBudgetRepository budgetRepository,
            TripExpenseRepository expenseRepository,
            ExpenseSplitRepository splitRepository,
            UserRepository userRepository
    ) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.budgetRepository = budgetRepository;
        this.expenseRepository = expenseRepository;
        this.splitRepository = splitRepository;
        this.userRepository = userRepository;
    }

    // ========== Helper Methods ==========

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

    // Budget DTOs
    public record BudgetCategoryRequest(String category, BigDecimal amount) {}
    public record SetBudgetRequest(List<BudgetCategoryRequest> categories, String currency) {}
    
    public record BudgetCategoryResponse(
            String category,
            BigDecimal budgeted,
            BigDecimal spent,
            BigDecimal remaining,
            int percentUsed
    ) {}
    
    public record BudgetSummaryResponse(
            BigDecimal totalBudget,
            BigDecimal totalSpent,
            BigDecimal remaining,
            int percentUsed,
            String currency,
            List<BudgetCategoryResponse> categories
    ) {}

    // Expense DTOs
    public record AddExpenseRequest(
            String title,
            String description,
            String category,
            BigDecimal amount,
            String currency,
            String expenseDate,  // ISO date string
            String splitType,    // "EQUAL", "CUSTOM", "NONE"
            List<CustomSplitRequest> customSplits  // Only if splitType = "CUSTOM"
    ) {}
    
    public record CustomSplitRequest(Long memberId, BigDecimal amount) {}
    
    public record ExpenseResponse(
            Long id,
            String title,
            String description,
            String category,
            BigDecimal amount,
            String currency,
            String expenseDate,
            String paidByName,
            Long paidById,
            String splitType,
            boolean settled,
            List<SplitResponse> splits,
            boolean canEdit,
            String createdAt
    ) {}
    
    public record SplitResponse(
            Long memberId,
            String memberName,
            BigDecimal amount,
            boolean paid
    ) {}

    // Balance DTOs
    public record MemberBalanceResponse(
            Long memberId,
            String memberName,
            BigDecimal totalPaid,      // Total this member has paid for
            BigDecimal totalOwes,      // Total this member owes others
            BigDecimal netBalance      // Positive = owed money, Negative = owes money
    ) {}
    
    public record SettlementSuggestion(
            Long fromMemberId,
            String fromMemberName,
            Long toMemberId,
            String toMemberName,
            BigDecimal amount
    ) {}
    
    public record BalanceSummaryResponse(
            List<MemberBalanceResponse> balances,
            List<SettlementSuggestion> settlements
    ) {}

    // ========== Budget Endpoints ==========

    /**
     * GET /trips/{tripId}/budget
     * Get budget summary with spending by category
     */
    @GetMapping("/budget")
    public ResponseEntity<BudgetSummaryResponse> getBudget(@PathVariable Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        List<TripBudget> budgets = budgetRepository.findByTrip(trip);
        List<Object[]> spentByCategory = expenseRepository.sumByCategory(trip);
        
        // Convert spent to map
        Map<String, BigDecimal> spentMap = new HashMap<>();
        for (Object[] row : spentByCategory) {
            spentMap.put((String) row[0], (BigDecimal) row[1]);
        }

        String currency = budgets.isEmpty() ? "USD" : budgets.get(0).getCurrency();
        
        List<BudgetCategoryResponse> categories = budgets.stream().map(b -> {
            BigDecimal spent = spentMap.getOrDefault(b.getCategory(), BigDecimal.ZERO);
            BigDecimal remaining = b.getBudgetedAmount().subtract(spent);
            int percentUsed = b.getBudgetedAmount().compareTo(BigDecimal.ZERO) > 0
                    ? spent.multiply(BigDecimal.valueOf(100))
                            .divide(b.getBudgetedAmount(), 0, RoundingMode.HALF_UP)
                            .intValue()
                    : 0;
            
            return new BudgetCategoryResponse(
                    b.getCategory(),
                    b.getBudgetedAmount(),
                    spent,
                    remaining,
                    Math.min(percentUsed, 100)
            );
        }).collect(Collectors.toList());

        BigDecimal totalBudget = budgets.stream()
                .map(TripBudget::getBudgetedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal totalSpent = expenseRepository.sumByTrip(trip);
        if (totalSpent == null) totalSpent = BigDecimal.ZERO;
        
        BigDecimal remaining = totalBudget.subtract(totalSpent);
        int percentUsed = totalBudget.compareTo(BigDecimal.ZERO) > 0
                ? totalSpent.multiply(BigDecimal.valueOf(100))
                        .divide(totalBudget, 0, RoundingMode.HALF_UP)
                        .intValue()
                : 0;

        return ResponseEntity.ok(new BudgetSummaryResponse(
                totalBudget,
                totalSpent,
                remaining,
                Math.min(percentUsed, 100),
                currency,
                categories
        ));
    }

    /**
     * PUT /trips/{tripId}/budget
     * Set or update budget categories
     */
    @PutMapping("/budget")
    public ResponseEntity<?> setBudget(
            @PathVariable Long tripId,
            @RequestBody SetBudgetRequest request
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        getCurrentMember(trip); // Verify membership

        String currency = request.currency() != null ? request.currency() : "USD";

        // Update or create budget for each category
        for (BudgetCategoryRequest cat : request.categories()) {
            Optional<TripBudget> existing = budgetRepository.findByTripAndCategory(trip, cat.category());
            
            if (existing.isPresent()) {
                TripBudget budget = existing.get();
                budget.setBudgetedAmount(cat.amount());
                budget.setCurrency(currency);
                budget.setUpdatedAt(Instant.now());
                budgetRepository.save(budget);
            } else {
                TripBudget budget = new TripBudget(trip, cat.category(), cat.amount(), currency);
                budgetRepository.save(budget);
            }
        }

        return ResponseEntity.ok(Map.of("message", "Budget updated"));
    }

    // ========== Expense Endpoints ==========

    /**
     * GET /trips/{tripId}/expenses
     * List all expenses for a trip
     */
    @GetMapping("/expenses")
    public ResponseEntity<List<ExpenseResponse>> getExpenses(@PathVariable Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember currentMember = getCurrentMember(trip);

        List<TripExpense> expenses = expenseRepository.findByTripOrderByCreatedAtDesc(trip);

        List<ExpenseResponse> response = expenses.stream().map(exp -> {
            List<ExpenseSplit> splits = splitRepository.findByExpense(exp);
            
            List<SplitResponse> splitResponses = splits.stream()
                    .map(s -> new SplitResponse(
                            s.getMember().getId(),
                            s.getMember().getDisplayName(),
                            s.getAmount(),
                            s.isPaid()
                    ))
                    .collect(Collectors.toList());

            boolean canEdit = exp.getPaidBy().getId().equals(currentMember.getId());

            return new ExpenseResponse(
                    exp.getId(),
                    exp.getTitle(),
                    exp.getDescription(),
                    exp.getCategory(),
                    exp.getAmount(),
                    exp.getCurrency(),
                    exp.getExpenseDate() != null ? exp.getExpenseDate().toString() : null,
                    exp.getPaidBy().getDisplayName(),
                    exp.getPaidBy().getId(),
                    exp.getSplitType(),
                    exp.isSettled(),
                    splitResponses,
                    canEdit,
                    exp.getCreatedAt().toString()
            );
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * POST /trips/{tripId}/expenses
     * Add a new expense
     */
    @PostMapping("/expenses")
    public ResponseEntity<?> addExpense(
            @PathVariable Long tripId,
            @RequestBody AddExpenseRequest request
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember currentMember = getCurrentMember(trip);

        // Validate
        if (request.title() == null || request.title().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Title is required"));
        }
        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Amount must be positive"));
        }

        // Create expense
        TripExpense expense = new TripExpense(
                trip,
                request.title().trim(),
                request.category() != null ? request.category() : "other",
                request.amount(),
                currentMember,
                request.splitType() != null ? request.splitType() : "EQUAL"
        );
        
        if (request.description() != null) {
            expense.setDescription(request.description().trim());
        }
        if (request.currency() != null) {
            expense.setCurrency(request.currency());
        }
        if (request.expenseDate() != null) {
            expense.setExpenseDate(LocalDate.parse(request.expenseDate()));
        }

        expenseRepository.save(expense);

        // Create splits based on split type
        List<TripMember> members = tripMemberRepository.findByTrip(trip);
        
        if ("EQUAL".equals(expense.getSplitType())) {
            // Split equally among all members
            BigDecimal splitAmount = expense.getAmount()
                    .divide(BigDecimal.valueOf(members.size()), 2, RoundingMode.HALF_UP);
            
            for (TripMember member : members) {
                ExpenseSplit split = new ExpenseSplit(expense, member, splitAmount);
                // The person who paid doesn't owe themselves
                if (member.getId().equals(currentMember.getId())) {
                    split.setPaid(true);
                    split.setPaidAt(Instant.now());
                }
                splitRepository.save(split);
            }
        } else if ("CUSTOM".equals(expense.getSplitType()) && request.customSplits() != null) {
            // Use custom split amounts
            for (CustomSplitRequest cs : request.customSplits()) {
                TripMember member = tripMemberRepository.findById(cs.memberId())
                        .orElseThrow(() -> new RuntimeException("Member not found: " + cs.memberId()));
                
                ExpenseSplit split = new ExpenseSplit(expense, member, cs.amount());
                if (member.getId().equals(currentMember.getId())) {
                    split.setPaid(true);
                    split.setPaidAt(Instant.now());
                }
                splitRepository.save(split);
            }
        }
        // If "NONE", no splits created - just tracking the expense

        return ResponseEntity.ok(Map.of(
                "id", expense.getId(),
                "message", "Expense added"
        ));
    }

    /**
     * DELETE /trips/{tripId}/expenses/{expenseId}
     * Delete an expense (only by person who added it)
     */
    @DeleteMapping("/expenses/{expenseId}")
    public ResponseEntity<?> deleteExpense(
            @PathVariable Long tripId,
            @PathVariable Long expenseId
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        TripMember currentMember = getCurrentMember(trip);

        TripExpense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found"));

        if (!expense.getTrip().getId().equals(tripId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Expense not in this trip"));
        }

        // Only the person who paid can delete
        if (!expense.getPaidBy().getId().equals(currentMember.getId())) {
            return ResponseEntity.status(403)
                    .body(Map.of("error", "Only the person who added this expense can delete it"));
        }

        // Delete splits first, then expense
        splitRepository.deleteByExpense(expense);
        expenseRepository.delete(expense);

        return ResponseEntity.ok(Map.of("message", "Expense deleted"));
    }

    // ========== Balance/Settlement Endpoints ==========

    /**
     * GET /trips/{tripId}/balances
     * Get balance summary and settlement suggestions
     */
    @GetMapping("/balances")
    public ResponseEntity<BalanceSummaryResponse> getBalances(@PathVariable Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        List<TripMember> members = tripMemberRepository.findByTrip(trip);
        List<TripExpense> expenses = expenseRepository.findByTripOrderByCreatedAtDesc(trip);

        // Calculate balances for each member
        Map<Long, BigDecimal> paid = new HashMap<>();      // What each member paid for
        Map<Long, BigDecimal> owes = new HashMap<>();      // What each member owes total

        for (TripMember m : members) {
            paid.put(m.getId(), BigDecimal.ZERO);
            owes.put(m.getId(), BigDecimal.ZERO);
        }

        // Sum up what each person paid
        for (TripExpense exp : expenses) {
            Long payerId = exp.getPaidBy().getId();
            paid.put(payerId, paid.get(payerId).add(exp.getAmount()));
        }

        // Sum up what each person owes (from splits)
        for (TripExpense exp : expenses) {
            List<ExpenseSplit> splits = splitRepository.findByExpense(exp);
            for (ExpenseSplit split : splits) {
                Long memberId = split.getMember().getId();
                owes.put(memberId, owes.get(memberId).add(split.getAmount()));
            }
        }

        // Build balance responses
        List<MemberBalanceResponse> balances = members.stream().map(m -> {
            BigDecimal totalPaid = paid.get(m.getId());
            BigDecimal totalOwes = owes.get(m.getId());
            BigDecimal netBalance = totalPaid.subtract(totalOwes);
            
            return new MemberBalanceResponse(
                    m.getId(),
                    m.getDisplayName(),
                    totalPaid,
                    totalOwes,
                    netBalance
            );
        }).collect(Collectors.toList());

        // Calculate settlement suggestions (minimize transactions)
        List<SettlementSuggestion> settlements = calculateSettlements(members, paid, owes);

        return ResponseEntity.ok(new BalanceSummaryResponse(balances, settlements));
    }

    /**
     * Simple settlement algorithm: pair up debtors with creditors
     */
    private List<SettlementSuggestion> calculateSettlements(
            List<TripMember> members,
            Map<Long, BigDecimal> paid,
            Map<Long, BigDecimal> owes
    ) {
        List<SettlementSuggestion> settlements = new ArrayList<>();
        
        // Calculate net balance for each member
        Map<Long, BigDecimal> netBalances = new HashMap<>();
        Map<Long, String> names = new HashMap<>();
        
        for (TripMember m : members) {
            BigDecimal net = paid.get(m.getId()).subtract(owes.get(m.getId()));
            netBalances.put(m.getId(), net);
            names.put(m.getId(), m.getDisplayName());
        }

        // Separate into creditors (positive balance) and debtors (negative balance)
        List<Map.Entry<Long, BigDecimal>> creditors = netBalances.entrySet().stream()
                .filter(e -> e.getValue().compareTo(BigDecimal.ZERO) > 0)
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .collect(Collectors.toList());

        List<Map.Entry<Long, BigDecimal>> debtors = netBalances.entrySet().stream()
                .filter(e -> e.getValue().compareTo(BigDecimal.ZERO) < 0)
                .sorted(Comparator.comparing(Map.Entry::getValue))
                .collect(Collectors.toList());

        // Match debtors to creditors
        int i = 0, j = 0;
        while (i < debtors.size() && j < creditors.size()) {
            Long debtorId = debtors.get(i).getKey();
            Long creditorId = creditors.get(j).getKey();
            
            BigDecimal debt = debtors.get(i).getValue().abs();
            BigDecimal credit = creditors.get(j).getValue();
            
            BigDecimal amount = debt.min(credit);
            
            if (amount.compareTo(new BigDecimal("0.01")) >= 0) {
                settlements.add(new SettlementSuggestion(
                        debtorId,
                        names.get(debtorId),
                        creditorId,
                        names.get(creditorId),
                        amount.setScale(2, RoundingMode.HALF_UP)
                ));
            }

            // Update remaining balances
            debtors.get(i).setValue(debtors.get(i).getValue().add(amount));
            creditors.get(j).setValue(creditors.get(j).getValue().subtract(amount));

            if (debtors.get(i).getValue().abs().compareTo(new BigDecimal("0.01")) < 0) i++;
            if (creditors.get(j).getValue().compareTo(new BigDecimal("0.01")) < 0) j++;
        }

        return settlements;
    }

    /**
     * POST /trips/{tripId}/expenses/{expenseId}/settle
     * Mark a split as paid/settled
     */
    @PostMapping("/expenses/{expenseId}/settle")
    public ResponseEntity<?> settleSplit(
            @PathVariable Long tripId,
            @PathVariable Long expenseId,
            @RequestParam Long memberId
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        getCurrentMember(trip); // Verify membership

        TripExpense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found"));

        TripMember member = tripMemberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("Member not found"));

        List<ExpenseSplit> splits = splitRepository.findByExpense(expense);
        Optional<ExpenseSplit> splitOpt = splits.stream()
                .filter(s -> s.getMember().getId().equals(memberId))
                .findFirst();

        if (splitOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No split found for this member"));
        }

        ExpenseSplit split = splitOpt.get();
        split.setPaid(true);
        split.setPaidAt(Instant.now());
        splitRepository.save(split);

        // Check if all splits are paid, mark expense as settled
        boolean allPaid = splits.stream().allMatch(ExpenseSplit::isPaid);
        if (allPaid) {
            expense.setSettled(true);
            expense.setUpdatedAt(Instant.now());
            expenseRepository.save(expense);
        }

        return ResponseEntity.ok(Map.of("message", "Split marked as paid"));
    }
}
