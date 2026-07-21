// src/main/java/com/tripsync/trip/TripIdeaRepository.java
package com.tripsync.trip;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface TripIdeaRepository extends JpaRepository<TripIdea, Long> {
    
    List<TripIdea> findByTripOrderByCreatedAtDesc(Trip trip);
    
    List<TripIdea> findByTripAndCategory(Trip trip, String category);
    
    @Modifying
    @Transactional
    void deleteByTrip(Trip trip);
}
