// src/main/java/com/tripsync/trip/TripExpenseRepository.java
package com.tripsync.trip;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface TripExpenseRepository extends JpaRepository<TripExpense, Long> {
    
    List<TripExpense> findByTripOrderByCreatedAtDesc(Trip trip);
    
    List<TripExpense> findByTripAndCategory(Trip trip, String category);
    
    List<TripExpense> findByPaidBy(TripMember member);
    
    // Sum of all expenses for a trip by category
    @Query("SELECT e.category, SUM(e.amount) FROM TripExpense e WHERE e.trip = :trip GROUP BY e.category")
    List<Object[]> sumByCategory(@Param("trip") Trip trip);
    
    // Total expenses for a trip
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM TripExpense e WHERE e.trip = :trip")
    BigDecimal sumByTrip(@Param("trip") Trip trip);
}
