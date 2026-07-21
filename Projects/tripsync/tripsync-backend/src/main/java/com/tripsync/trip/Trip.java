package com.tripsync.trip;

import com.tripsync.user.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "trips")
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;        // e.g. "Yellowstone & Tetons"

    @Column(nullable = true)
    private String destination; // free text for now — null means "not decided yet"

    @Column(nullable = true, length = 1000)
    private String photoAlbumUrl; // shared Google Photos / iCloud album link

    @ManyToOne
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @Column(nullable = false)
    private Instant createdAt;

    public Trip() {
    }

    public Trip(Long id, String name, String destination, User createdBy, Instant createdAt) {
        this.id = id;
        this.name = name;
        this.destination = destination;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
    }

    // getters & setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) { this.id = id; }

    public String getName() {
        return name;
    }

    public void setName(String name) { this.name = name; }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) { this.destination = destination; }

    public String getPhotoAlbumUrl() { return photoAlbumUrl; }

    public void setPhotoAlbumUrl(String photoAlbumUrl) { this.photoAlbumUrl = photoAlbumUrl; }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
