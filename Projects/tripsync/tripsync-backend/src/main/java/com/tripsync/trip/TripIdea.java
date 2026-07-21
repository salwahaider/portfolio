// src/main/java/com/tripsync/trip/TripIdea.java
package com.tripsync.trip;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "trip_ideas")
public class TripIdea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(length = 500)
    private String link;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "added_by_id", nullable = false)
    private TripMember addedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Trip getTrip() { return trip; }
    public void setTrip(Trip trip) { this.trip = trip; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }

    public TripMember getAddedBy() { return addedBy; }
    public void setAddedBy(TripMember addedBy) { this.addedBy = addedBy; }

    public Instant getCreatedAt() { return createdAt; }
}
