package com.tripsync.trip;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface SelectedFlightRepository extends JpaRepository<SelectedFlight, Long> {

    List<SelectedFlight> findByTrip(Trip trip);

    List<SelectedFlight> findByTripAndMember(Trip trip, TripMember member);

    @Transactional
    void deleteByTripAndMemberAndDirection(Trip trip, TripMember member, String direction);
}
