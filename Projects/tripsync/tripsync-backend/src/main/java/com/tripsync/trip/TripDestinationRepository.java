// src/main/java/com/tripsync/trip/TripDestinationRepository.java
package com.tripsync.trip;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TripDestinationRepository extends JpaRepository<TripDestination, Long> {
    
    List<TripDestination> findByTripOrderByCreatedAtDesc(Trip trip);
    
    List<TripDestination> findByTrip(Trip trip);
}
