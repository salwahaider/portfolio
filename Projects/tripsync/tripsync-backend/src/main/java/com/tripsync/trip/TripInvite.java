package com.tripsync.trip;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "trip_invites")
public class TripInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(nullable = false, unique = true)
    private String code;        // e.g. random string for URL

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant expiresAt;

    public TripInvite() {
    }

    public TripInvite(Long id, Trip trip, String code, Instant createdAt, Instant expiresAt) {
        this.id = id;
        this.trip = trip;
        this.code = code;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    // getters & setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) { this.id = id; }

    public Trip getTrip() {
        return trip;
    }

    public void setTrip(Trip trip) { this.trip = trip; }

    public String getCode() {
        return code;
    }

    public void setCode(String code) { this.code = code; }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}
