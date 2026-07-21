// src/main/java/com/tripsync/trip/IdeaVoteRepository.java
package com.tripsync.trip;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface IdeaVoteRepository extends JpaRepository<IdeaVote, Long> {
    
    List<IdeaVote> findByIdea(TripIdea idea);
    
    Optional<IdeaVote> findByIdeaAndMember(TripIdea idea, TripMember member);
    
    long countByIdea(TripIdea idea);
    
    boolean existsByIdeaAndMember(TripIdea idea, TripMember member);
    
    @Modifying
    @Transactional
    void deleteByIdea(TripIdea idea);
    
    @Modifying
    @Transactional
    void deleteByIdeaAndMember(TripIdea idea, TripMember member);
}
