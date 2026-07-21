// src/main/java/com/tripsync/trip/TripBudgetRepository.java
package com.tripsync.trip;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface TripBudgetRepository extends JpaRepository<TripBudget, Long> {
    
    List<TripBudget> findByTrip(Trip trip);
    
    Optional<TripBudget> findByTripAndCategory(Trip trip, String category);
    
    @Modifying
    @Transactional
    void deleteByTrip(Trip trip);
}
