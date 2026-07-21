package com.tripsync.trip;

import com.tripsync.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TripRepository extends JpaRepository<Trip, Long> {

    List<Trip> findByCreatedBy(User user);

    // 👉 new method: all trips where this user is a member
    @Query(
            "select distinct t " +
                    "from Trip t " +
                    "join TripMember tm on tm.trip = t " +
                    "where tm.user = :user " +
                    "order by t.createdAt desc"
    )
    List<Trip> findAllForUser(@Param("user") User user);
}
