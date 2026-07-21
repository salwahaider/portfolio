package com.tripsync.trip;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface TripAvailabilityRepository extends JpaRepository<TripAvailability, Long> {

    List<TripAvailability> findByTrip(Trip trip);

    List<TripAvailability> findByTripAndMember(Trip trip, TripMember member);

    @Modifying
    @Transactional
    void deleteByTripAndMember(Trip trip, TripMember member);
}