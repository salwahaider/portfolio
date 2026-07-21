// src/main/java/com/tripsync/trip/DestinationVoteRepository.java
package com.tripsync.trip;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface DestinationVoteRepository extends JpaRepository<DestinationVote, Long> {
    
    // Find all votes for a destination
    List<DestinationVote> findByDestination(TripDestination destination);
    
    // Count votes for a destination
    long countByDestination(TripDestination destination);
    
    // Check if a member has voted for a destination
    Optional<DestinationVote> findByDestinationAndMember(TripDestination destination, TripMember member);
    
    // Check if vote exists
    boolean existsByDestinationAndMember(TripDestination destination, TripMember member);
    
    // Delete a specific vote
    @Modifying
    @Transactional
    void deleteByDestinationAndMember(TripDestination destination, TripMember member);
    
    // Delete all votes for a destination (when destination is deleted)
    @Modifying
    @Transactional
    void deleteByDestination(TripDestination destination);
}
