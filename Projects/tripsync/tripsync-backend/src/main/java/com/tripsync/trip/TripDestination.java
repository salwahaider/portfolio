// src/main/java/com/tripsync/trip/TripDestination.java
package com.tripsync.trip;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "trip_destinations")
public class TripDestination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(nullable = false)
    private String name;  // e.g., "Honolulu, HI"

    @Column
    private String label;  // e.g., "Beach paradise"

    @Column
    private String emoji;  // e.g., "🏝️"

    @Column(name = "price_tag")
    private String priceTag;  // e.g., "$", "$$", "$$$"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "added_by_id")
    private TripMember addedBy;

    @Column(nullable = false)
    private Instant createdAt;

    public TripDestination() {}

    public TripDestination(Trip trip, String name, String label, String emoji, String priceTag, TripMember addedBy) {
        this.trip = trip;
        this.name = name;
        this.label = label;
        this.emoji = emoji;
        this.priceTag = priceTag;
        this.addedBy = addedBy;
        this.createdAt = Instant.now();
    }

    // Getters and Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Trip getTrip() { return trip; }
    public void setTrip(Trip trip) { this.trip = trip; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getEmoji() { return emoji; }
    public void setEmoji(String emoji) { this.emoji = emoji; }

    public String getPriceTag() { return priceTag; }
    public void setPriceTag(String priceTag) { this.priceTag = priceTag; }

    public TripMember getAddedBy() { return addedBy; }
    public void setAddedBy(TripMember addedBy) { this.addedBy = addedBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
