// src/main/java/com/tripsync/trip/ExpenseSplitRepository.java
package com.tripsync.trip;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

public interface ExpenseSplitRepository extends JpaRepository<ExpenseSplit, Long> {
    
    List<ExpenseSplit> findByExpense(TripExpense expense);
    
    List<ExpenseSplit> findByMember(TripMember member);
    
    // Find all splits for a member across all expenses in a trip
    @Query("SELECT es FROM ExpenseSplit es WHERE es.member = :member AND es.expense.trip = :trip")
    List<ExpenseSplit> findByMemberAndTrip(@Param("member") TripMember member, @Param("trip") Trip trip);
    
    // Sum of what a member owes (unpaid splits)
    @Query("SELECT COALESCE(SUM(es.amount), 0) FROM ExpenseSplit es WHERE es.member = :member AND es.expense.trip = :trip AND es.paid = false")
    BigDecimal sumUnpaidByMemberAndTrip(@Param("member") TripMember member, @Param("trip") Trip trip);
    
    // Delete all splits for an expense
    @Modifying
    @Transactional
    void deleteByExpense(TripExpense expense);
}
