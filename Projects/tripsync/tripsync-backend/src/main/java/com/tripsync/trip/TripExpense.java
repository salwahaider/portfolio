// src/main/java/com/tripsync/trip/TripExpense.java
package com.tripsync.trip;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "trip_expenses")
public class TripExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(nullable = false)
    private String title;  // e.g., "Airbnb - 3 nights", "Rental car", "Flight - DFW to HNL"

    @Column(length = 500)
    private String description;

    @Column(nullable = false, length = 50)
    private String category;  // "flights", "hotels", "food", "activities", "transport", "other"

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(length = 3)
    private String currency = "USD";

    @Column(name = "expense_date")
    private LocalDate expenseDate;  // When the expense occurred/will occur

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "paid_by_id", nullable = false)
    private TripMember paidBy;  // Who paid for this

    @Column(name = "split_type", length = 20)
    private String splitType = "EQUAL";  // "EQUAL", "CUSTOM", "NONE" (no split, just tracking)

    @Column(name = "receipt_url", length = 500)
    private String receiptUrl;  // Optional receipt image URL

    @Column(name = "is_settled")
    private boolean settled = false;  // Has this been settled up?

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public TripExpense() {}

    public TripExpense(Trip trip, String title, String category, BigDecimal amount, 
                       TripMember paidBy, String splitType) {
        this.trip = trip;
        this.title = title;
        this.category = category;
        this.amount = amount;
        this.paidBy = paidBy;
        this.splitType = splitType != null ? splitType : "EQUAL";
        this.currency = "USD";
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    // Getters and Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Trip getTrip() { return trip; }
    public void setTrip(Trip trip) { this.trip = trip; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public LocalDate getExpenseDate() { return expenseDate; }
    public void setExpenseDate(LocalDate expenseDate) { this.expenseDate = expenseDate; }

    public TripMember getPaidBy() { return paidBy; }
    public void setPaidBy(TripMember paidBy) { this.paidBy = paidBy; }

    public String getSplitType() { return splitType; }
    public void setSplitType(String splitType) { this.splitType = splitType; }

    public String getReceiptUrl() { return receiptUrl; }
    public void setReceiptUrl(String receiptUrl) { this.receiptUrl = receiptUrl; }

    public boolean isSettled() { return settled; }
    public void setSettled(boolean settled) { this.settled = settled; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
