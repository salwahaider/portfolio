// src/main/java/com/tripsync/trip/DestinationVote.java
package com.tripsync.trip;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "destination_votes",
    uniqueConstraints = @UniqueConstraint(columnNames = {"destination_id", "member_id"})
)
public class DestinationVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "destination_id", nullable = false)
    private TripDestination destination;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private TripMember member;

    @Column(nullable = false)
    private Instant createdAt;

    public DestinationVote() {}

    public DestinationVote(TripDestination destination, TripMember member) {
        this.destination = destination;
        this.member = member;
        this.createdAt = Instant.now();
    }

    // Getters and Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public TripDestination getDestination() { return destination; }
    public void setDestination(TripDestination destination) { this.destination = destination; }

    public TripMember getMember() { return member; }
    public void setMember(TripMember member) { this.member = member; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
