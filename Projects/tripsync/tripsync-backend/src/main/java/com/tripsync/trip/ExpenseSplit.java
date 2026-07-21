// src/main/java/com/tripsync/trip/ExpenseSplit.java
package com.tripsync.trip;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(
    name = "expense_splits",
    uniqueConstraints = @UniqueConstraint(columnNames = {"expense_id", "member_id"})
)
public class ExpenseSplit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expense_id", nullable = false)
    private TripExpense expense;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private TripMember member;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;  // Amount this member owes for this expense

    @Column(name = "is_paid")
    private boolean paid = false;  // Has this member paid their share?

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public ExpenseSplit() {}

    public ExpenseSplit(TripExpense expense, TripMember member, BigDecimal amount) {
        this.expense = expense;
        this.member = member;
        this.amount = amount;
        this.paid = false;
        this.createdAt = Instant.now();
    }

    // Getters and Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public TripExpense getExpense() { return expense; }
    public void setExpense(TripExpense expense) { this.expense = expense; }

    public TripMember getMember() { return member; }
    public void setMember(TripMember member) { this.member = member; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public boolean isPaid() { return paid; }
    public void setPaid(boolean paid) { this.paid = paid; }

    public Instant getPaidAt() { return paidAt; }
    public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
