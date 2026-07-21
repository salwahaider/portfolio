package com.tripsync.trip;

import com.tripsync.user.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "trip_members")
public class TripMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;              // null for guests

    @Column(nullable = false)
    private boolean guest;          // true = guest, false = linked to user

    @Column(nullable = false)
    private String displayName;     // “Salwa”, “Ihfaz”, “Friend from SF”

    @Column(nullable = false)
    private String homeAirport;     // e.g. "DFW", "SFO", "AUS"

    @Column(nullable = false)
    private Instant joinedAt;

    public TripMember() {
    }

    public TripMember(Long id,
                      Trip trip,
                      User user,
                      boolean guest,
                      String displayName,
                      String homeAirport,
                      Instant joinedAt) {
        this.id = id;
        this.trip = trip;
        this.user = user;
        this.guest = guest;
        this.displayName = displayName;
        this.homeAirport = homeAirport;
        this.joinedAt = joinedAt;
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

    public User getUser() {
        return user;
    }

    public void setUser(User user) { this.user = user; }

    public boolean isGuest() {
        return guest;
    }

    public void setGuest(boolean guest) { this.guest = guest; }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getHomeAirport() {
        return homeAirport;
    }

    public void setHomeAirport(String homeAirport) { this.homeAirport = homeAirport; }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }
}
