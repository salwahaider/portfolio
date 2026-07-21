// src/main/java/com/tripsync/trip/IdeaVote.java
package com.tripsync.trip;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "idea_votes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"idea_id", "member_id"})
})
public class IdeaVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "idea_id", nullable = false)
    private TripIdea idea;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private TripMember member;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public TripIdea getIdea() { return idea; }
    public void setIdea(TripIdea idea) { this.idea = idea; }

    public TripMember getMember() { return member; }
    public void setMember(TripMember member) { this.member = member; }

    public Instant getCreatedAt() { return createdAt; }
}
