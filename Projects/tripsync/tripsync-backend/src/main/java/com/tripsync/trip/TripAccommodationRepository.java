package com.tripsync.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TripAccommodationRepository extends JpaRepository<TripAccommodation, Long> {

    List<TripAccommodation> findByTripOrderByCheckInDateAsc(Trip trip);
}
