package com.tripsync.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TripFlightInfoRepository extends JpaRepository<TripFlightInfo, Long> {

    List<TripFlightInfo> findByTrip(Trip trip);

    Optional<TripFlightInfo> findByTripAndMember(Trip trip, TripMember member);
}
