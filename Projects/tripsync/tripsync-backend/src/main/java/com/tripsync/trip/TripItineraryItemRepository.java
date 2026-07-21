package com.tripsync.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TripItineraryItemRepository extends JpaRepository<TripItineraryItem, Long> {

    List<TripItineraryItem> findByTripOrderByDayDateAscSortOrderAscStartTimeAsc(Trip trip);
}
