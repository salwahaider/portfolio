package com.tripsync.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TripInviteRepository extends JpaRepository<TripInvite, Long> {

    Optional<TripInvite> findByCode(String code);
}
