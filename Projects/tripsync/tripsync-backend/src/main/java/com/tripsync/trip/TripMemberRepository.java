package com.tripsync.trip;

import com.tripsync.trip.Trip;
import com.tripsync.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TripMemberRepository extends JpaRepository<TripMember, Long> {

    List<TripMember> findByTrip(Trip trip);

    Optional<TripMember> findByTripAndUser(Trip trip, User user);

    int countByTrip(Trip trip);
}
