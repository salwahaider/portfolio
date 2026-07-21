package com.tripsync.trip;

import jakarta.persistence.*;

@Entity
@Table(name = "trip_flight_infos", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"trip_id", "member_id"})
})
public class TripFlightInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne
    @JoinColumn(name = "member_id", nullable = false)
    private TripMember member;

    // Stored as ISO datetime string from the browser datetime-local input ("YYYY-MM-DDTHH:MM")
    @Column(name = "arrival_datetime")
    private String arrivalDatetime;

    @Column(name = "arrival_flight_number")
    private String arrivalFlightNumber;

    @Column(name = "arrival_airport")
    private String arrivalAirport;

    @Column(name = "departure_datetime")
    private String departureDatetime;

    @Column(name = "departure_flight_number")
    private String departureFlightNumber;

    @Column(name = "departure_airport")
    private String departureAirport;

    public TripFlightInfo() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Trip getTrip() { return trip; }
    public void setTrip(Trip trip) { this.trip = trip; }

    public TripMember getMember() { return member; }
    public void setMember(TripMember member) { this.member = member; }

    public String getArrivalDatetime() { return arrivalDatetime; }
    public void setArrivalDatetime(String arrivalDatetime) { this.arrivalDatetime = arrivalDatetime; }

    public String getArrivalFlightNumber() { return arrivalFlightNumber; }
    public void setArrivalFlightNumber(String arrivalFlightNumber) { this.arrivalFlightNumber = arrivalFlightNumber; }

    public String getArrivalAirport() { return arrivalAirport; }
    public void setArrivalAirport(String arrivalAirport) { this.arrivalAirport = arrivalAirport; }

    public String getDepartureDatetime() { return departureDatetime; }
    public void setDepartureDatetime(String departureDatetime) { this.departureDatetime = departureDatetime; }

    public String getDepartureFlightNumber() { return departureFlightNumber; }
    public void setDepartureFlightNumber(String departureFlightNumber) { this.departureFlightNumber = departureFlightNumber; }

    public String getDepartureAirport() { return departureAirport; }
    public void setDepartureAirport(String departureAirport) { this.departureAirport = departureAirport; }
}
