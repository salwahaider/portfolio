// src/pages/Itinerary.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../utils/api";

// ============================================
// TYPES
// ============================================

type Theme = "light" | "dark";

interface Flight {
  id: number;
  memberId: number;
  memberName: string;
  arrivalDatetime: string | null;
  arrivalFlightNumber: string | null;
  arrivalAirport: string | null;
  departureDatetime: string | null;
  departureFlightNumber: string | null;
  departureAirport: string | null;
}

interface Accommodation {
  id: number;
  name: string;
  address: string;
  checkInDate: string | null;
  checkInTime: string | null;
  checkOutDate: string | null;
  checkOutTime: string | null;
  notes: string | null;
}

interface ItineraryItem {
  id: number;
  dayDate: string;
  startTime: string | null;
  endTime: string | null;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  sortOrder: number;
  notes: string | null;
  travelTimeMinutes: number | null;
  isAiGenerated: boolean;
}

interface ItineraryDay {
  date: string;
  dayLabel: string;
  items: ItineraryItem[];
}

interface TripMember {
  id: number;
  displayName: string;
  isCurrentUser: boolean;
}

interface Trip {
  id: number;
  name: string;
  destination: string;
}

interface Idea {
  id: number;
  title: string;
  description: string | null;
  category: string;
  votes: number;
}

// ============================================
// COMPONENT
// ============================================

export default function Itinerary() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  // Theme
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("tripsync-theme");
    return (saved === "dark" || saved === "light") ? saved : "light";
  });

  // Data
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState<"itinerary" | "setup">("setup");
  const [showFlightModal, setShowFlightModal] = useState(false);
  const [showAccommodationModal, setShowAccommodationModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Forms
  const [flightForm, setFlightForm] = useState({
    arrivalDatetime: "",
    arrivalFlightNumber: "",
    arrivalAirport: "",
    departureDatetime: "",
    departureFlightNumber: "",
    departureAirport: "",
  });

  const [accommodationForm, setAccommodationForm] = useState({
    name: "",
    address: "",
    checkInDate: "",
    checkInTime: "",
    checkOutDate: "",
    checkOutTime: "",
  });

  const [newItemForm, setNewItemForm] = useState({
    dayDate: "",
    startTime: "",
    endTime: "",
    title: "",
    description: "",
    category: "activity",
    location: "",
    notes: "",
  });

  const currentUser = members.find((m) => m.isCurrentUser);
  const myFlight = flights.find((f) => f.memberId === currentUser?.id);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchAll = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);

    try {
      const [tripData, membersData, flightsData, accommodationsData, itineraryData, contextData] = await Promise.all([
        api<Trip>(`/trips/${tripId}`),
        api<TripMember[]>(`/trips/${tripId}/members`),
        api<Flight[]>(`/trips/${tripId}/flights`),
        api<Accommodation[]>(`/trips/${tripId}/accommodations`),
        api<ItineraryDay[]>(`/trips/${tripId}/itinerary`),
        api<{ ideas: Idea[] }>(`/trips/${tripId}/itinerary/context`),
      ]);

      setTrip(tripData);
      setMembers(membersData);
      setFlights(flightsData);
      setAccommodations(accommodationsData);
      setItinerary(itineraryData);
      setIdeas(contextData.ideas || []);

      // Pre-fill flight form if user has existing flight
      const userFlight = flightsData.find((f: Flight) => 
        membersData.find((m: TripMember) => m.isCurrentUser && m.id === f.memberId)
      );
      if (userFlight) {
        setFlightForm({
          arrivalDatetime: userFlight.arrivalDatetime?.slice(0, 16) || "",
          arrivalFlightNumber: userFlight.arrivalFlightNumber || "",
          arrivalAirport: userFlight.arrivalAirport || "",
          departureDatetime: userFlight.departureDatetime?.slice(0, 16) || "",
          departureFlightNumber: userFlight.departureFlightNumber || "",
          departureAirport: userFlight.departureAirport || "",
        });
      }

      if (itineraryData.length > 0) {
        setActiveTab("itinerary");
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    localStorage.setItem("tripsync-theme", theme);
  }, [theme]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSaveFlight = async () => {
    try {
      await api(`/trips/${tripId}/flights`, {
        method: "POST",
        body: JSON.stringify(flightForm),
      });
      setShowFlightModal(false);
      fetchAll();
    } catch (err) {
      console.error("Failed to save flight", err);
      alert("Failed to save flight info");
    }
  };

  const handleSaveAccommodation = async () => {
    if (!accommodationForm.name || !accommodationForm.address) {
      alert("Please enter accommodation name and address");
      return;
    }

    try {
      await api(`/trips/${tripId}/accommodations`, {
        method: "POST",
        body: JSON.stringify(accommodationForm),
      });
      setShowAccommodationModal(false);
      setAccommodationForm({ name: "", address: "", checkInDate: "", checkInTime: "", checkOutDate: "", checkOutTime: "" });
      fetchAll();
    } catch (err) {
      console.error("Failed to save accommodation", err);
      alert("Failed to save accommodation");
    }
  };

  const handleDeleteAccommodation = async (id: number) => {
    if (!confirm("Delete this accommodation?")) return;
    try {
      await api(`/trips/${tripId}/accommodations/${id}`, { method: "DELETE" });
      fetchAll();
    } catch (err) {
      console.error("Failed to delete accommodation", err);
    }
  };

  const handleAddItineraryItem = async () => {
    if (!newItemForm.dayDate || !newItemForm.title) {
      alert("Please enter a date and title");
      return;
    }

    try {
      await api(`/trips/${tripId}/itinerary`, {
        method: "POST",
        body: JSON.stringify(newItemForm),
      });
      setShowAddItemModal(false);
      setNewItemForm({ dayDate: "", startTime: "", endTime: "", title: "", description: "", category: "activity", location: "", notes: "" });
      fetchAll();
    } catch (err) {
      console.error("Failed to add item", err);
      alert("Failed to add itinerary item");
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm("Delete this item?")) return;
    try {
      await api(`/trips/${tripId}/itinerary/${itemId}`, { method: "DELETE" });
      fetchAll();
    } catch (err) {
      console.error("Failed to delete item", err);
    }
  };

  const handleGenerateItinerary = async () => {
    if (accommodations.length === 0) {
      alert("Please add your accommodation first.");
      return;
    }
    if (ideas.length === 0) {
      alert("Please add some ideas to the Ideas Board first.");
      return;
    }

    setGenerating(true);

    let startDate = accommodations[0]?.checkInDate;
    let endDate = accommodations[0]?.checkOutDate;

    if (!startDate || !endDate) {
      alert("Please set check-in/check-out dates for your accommodation.");
      setGenerating(false);
      return;
    }

    try {
      // Generate simple itinerary from top ideas
      const topIdeas = ideas.slice(0, 10);
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      let ideaIndex = 0;

      for (let day = 0; day < dayCount && ideaIndex < topIdeas.length; day++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + day);
        const dateStr = currentDate.toISOString().slice(0, 10);

        // Morning activity
        if (ideaIndex < topIdeas.length) {
          const idea = topIdeas[ideaIndex++];
          await api(`/trips/${tripId}/itinerary`, {
            method: "POST",
            body: JSON.stringify({
              dayDate: dateStr,
              startTime: "10:00",
              endTime: "12:00",
              title: idea.title,
              description: idea.description,
              category: idea.category,
              sortOrder: 1,
              notes: `Top voted (${idea.votes} votes)`,
            }),
          });
        }

        // Afternoon activity
        if (ideaIndex < topIdeas.length) {
          const idea = topIdeas[ideaIndex++];
          await api(`/trips/${tripId}/itinerary`, {
            method: "POST",
            body: JSON.stringify({
              dayDate: dateStr,
              startTime: "14:00",
              endTime: "17:00",
              title: idea.title,
              description: idea.description,
              category: idea.category,
              sortOrder: 2,
              notes: `Top voted (${idea.votes} votes)`,
            }),
          });
        }
      }

      await fetchAll();
      setActiveTab("itinerary");
    } catch (err) {
      console.error("Failed to generate itinerary", err);
      alert("Failed to generate itinerary");
    } finally {
      setGenerating(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen page-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  const canGenerate = accommodations.length > 0 && ideas.length > 0;

  return (
    <div className="min-h-screen flex page-gradient text-[var(--text)]">
      {/* SIDEBAR */}
      <aside className="sidebar w-72 flex flex-col shrink-0 border-r border-[var(--border)] bg-white/80 dark:bg-[#1a1a24] backdrop-blur-xl h-screen sticky top-0 overflow-y-auto">
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <div className="sidebar-logo h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-bold cursor-pointer" onClick={() => navigate("/trips")}>
            TS
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--text)]">TripSync</span>
            <span className="text-xs text-[var(--text-muted)]">Group travel made easy</span>
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-2 px-4">
          <button className="sidebar-link w-full flex items-center gap-3 px-4 py-3 rounded-2xl" onClick={() => navigate(`/trip/${tripId}`)}>
            <span className="text-xl">🗺️</span>
            <span className="text-sm font-medium">Trip Board</span>
          </button>
          <button className="sidebar-nav-active w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl">
            <span className="flex items-center gap-3">
              <span className="text-xl">📋</span>
              <span className="text-sm font-medium">Itinerary</span>
            </span>
            <span className="active-chip text-[10px] px-2 py-0.5 rounded-full">Active</span>
          </button>
          <button className="sidebar-link" onClick={() => navigate(`/trip/${tripId}/flights`)}><span className="text-xl">✈️</span><span>Flights</span></button>
          <button className="sidebar-link"><span className="text-xl">🏨</span><span>Hotels</span></button>
          <button className="sidebar-link" onClick={() => navigate(`/trip/${tripId}/split-costs`)}>
            <span className="text-xl">💰</span><span>Split costs</span>
          </button>
        </nav>

        <div className="px-4 pb-6 pt-2">
          <div className="account-chip flex items-center gap-3">
            <div className="account-avatar">{currentUser?.displayName.charAt(0).toUpperCase() || "?"}</div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[var(--text)]">{currentUser?.displayName || "Guest"}</span>
              <span className="text-xs text-[var(--text-muted)]">Free plan</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col">
        <header className="border-b border-[var(--border)] bg-[var(--panel)] backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[var(--text)]">Itinerary</h1>
              <p className="text-xs text-[var(--text-muted)]">{trip?.name}</p>
            </div>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="theme-toggle">
              {theme === "dark" ? "☀️" : "🌙"} <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-8 py-8">
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button onClick={() => setActiveTab("setup")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "setup" ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] text-[var(--text-muted)]"}`}>
                Setup
              </button>
              <button onClick={() => setActiveTab("itinerary")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "itinerary" ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] text-[var(--text-muted)]"}`}>
                Itinerary {itinerary.length > 0 && `(${itinerary.length} days)`}
              </button>
            </div>

            {/* SETUP TAB */}
            {activeTab === "setup" && (
              <div className="space-y-6">
                {/* Flight Section */}
                <div className="glass-card rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-[var(--text)]">My Flight Info</h2>
                      <p className="text-sm text-[var(--text-muted)]">When are you arriving and departing?</p>
                    </div>
                    <button onClick={() => setShowFlightModal(true)} className="btn-accent text-sm">{myFlight ? "Edit" : "+ Add"}</button>
                  </div>
                  {myFlight ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--card-border)]">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Arrival</p>
                        <p className="font-medium text-[var(--text)]">{myFlight.arrivalDatetime ? new Date(myFlight.arrivalDatetime).toLocaleString() : "Not set"}</p>
                        {myFlight.arrivalFlightNumber && <p className="text-sm text-[var(--text-muted)]">Flight {myFlight.arrivalFlightNumber}</p>}
                      </div>
                      <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--card-border)]">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Departure</p>
                        <p className="font-medium text-[var(--text)]">{myFlight.departureDatetime ? new Date(myFlight.departureDatetime).toLocaleString() : "Not set"}</p>
                        {myFlight.departureFlightNumber && <p className="text-sm text-[var(--text-muted)]">Flight {myFlight.departureFlightNumber}</p>}
                      </div>
                    </div>
                  ) : <p className="text-sm text-[var(--text-muted)]">No flight info added yet</p>}
                </div>

                {/* Group Flights */}
                {flights.length > 1 && (
                  <div className="glass-card rounded-3xl p-6">
                    <h2 className="text-lg font-bold text-[var(--text)] mb-4">Group Arrivals & Departures</h2>
                    <div className="space-y-3">
                      {flights.map((f) => (
                        <div key={f.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)]">
                          <span className="font-medium text-[var(--text)]">{f.memberName}</span>
                          <div className="text-right text-sm">
                            <p className="text-[var(--text-muted)]">Arrives: {f.arrivalDatetime ? new Date(f.arrivalDatetime).toLocaleDateString() : "TBD"}</p>
                            <p className="text-[var(--text-muted)]">Departs: {f.departureDatetime ? new Date(f.departureDatetime).toLocaleDateString() : "TBD"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accommodation */}
                <div className="glass-card rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-[var(--text)]">Accommodation</h2>
                      <p className="text-sm text-[var(--text-muted)]">Where are you staying?</p>
                    </div>
                    <button onClick={() => setShowAccommodationModal(true)} className="btn-accent text-sm">+ Add</button>
                  </div>
                  {accommodations.length > 0 ? (
                    <div className="space-y-3">
                      {accommodations.map((acc) => (
                        <div key={acc.id} className="p-4 rounded-xl bg-[var(--card)] border border-[var(--card-border)]">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-[var(--text)]">{acc.name}</h3>
                              <p className="text-sm text-[var(--text-muted)]">{acc.address}</p>
                              {acc.checkInDate && <p className="text-xs text-[var(--text-muted)] mt-2">{acc.checkInDate} → {acc.checkOutDate}</p>}
                            </div>
                            <button onClick={() => handleDeleteAccommodation(acc.id)} className="text-[var(--text-muted)] hover:text-red-500">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-[var(--text-muted)]">No accommodation added yet</p>}
                </div>

                {/* Ideas Summary */}
                <div className="glass-card rounded-3xl p-6">
                  <h2 className="text-lg font-bold text-[var(--text)] mb-2">Ideas from Board</h2>
                  <p className="text-sm text-[var(--text-muted)] mb-4">{ideas.length} ideas, sorted by votes</p>
                  {ideas.length > 0 ? (
                    <div className="space-y-2">
                      {ideas.slice(0, 5).map((idea, i) => (
                        <div key={idea.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)]">
                          <span className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                          <span className="flex-1 font-medium text-[var(--text)]">{idea.title}</span>
                          <span className="text-sm text-[var(--text-muted)]">{idea.votes} votes</span>
                        </div>
                      ))}
                      {ideas.length > 5 && <p className="text-xs text-[var(--text-muted)] text-center pt-2">+ {ideas.length - 5} more</p>}
                    </div>
                  ) : <p className="text-sm text-[var(--text-muted)]">No ideas yet. <button onClick={() => navigate(`/trip/${tripId}`)} className="text-[var(--accent)]">Add ideas</button></p>}
                </div>

                {/* Generate */}
                <div className="glass-card rounded-3xl p-6 text-center">
                  <h2 className="text-lg font-bold text-[var(--text)] mb-2">Generate AI Itinerary</h2>
                  <p className="text-sm text-[var(--text-muted)] mb-4 max-w-md mx-auto">Based on your top-voted ideas, we'll create an optimized day-by-day schedule.</p>
                  {!canGenerate && <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">{accommodations.length === 0 && "Add accommodation • "}{ideas.length === 0 && "Add ideas"}</p>}
                  <button onClick={handleGenerateItinerary} disabled={!canGenerate || generating} className="btn-accent px-8">{generating ? "Generating..." : "Generate Itinerary"}</button>
                </div>
              </div>
            )}

            {/* ITINERARY TAB */}
            {activeTab === "itinerary" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[var(--text)]">Your Itinerary</h2>
                  <button onClick={() => setShowAddItemModal(true)} className="btn-accent text-sm">+ Add Activity</button>
                </div>
                {itinerary.length === 0 ? (
                  <div className="glass-card rounded-3xl p-12 text-center">
                    <h3 className="text-lg font-semibold text-[var(--text)] mb-2">No itinerary yet</h3>
                    <p className="text-sm text-[var(--text-muted)] mb-6">Set up your flight info and accommodation, then generate an AI itinerary.</p>
                    <button onClick={() => setActiveTab("setup")} className="btn-accent">Go to Setup</button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {itinerary.map((day) => (
                      <div key={day.date} className="glass-card rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center font-bold">{day.dayLabel.replace("Day ", "")}</div>
                          <div>
                            <h3 className="font-bold text-[var(--text)]">{day.dayLabel}</h3>
                            <p className="text-sm text-[var(--text-muted)]">{new Date(day.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {day.items.map((item) => (
                            <div key={item.id} className="flex gap-4 p-4 rounded-xl bg-[var(--card)] border border-[var(--card-border)]">
                              <div className="text-sm text-[var(--text-muted)] w-20 shrink-0">
                                {item.startTime && <p className="font-medium text-[var(--text)]">{item.startTime.slice(0, 5)}</p>}
                                {item.endTime && <p className="text-xs">to {item.endTime.slice(0, 5)}</p>}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-[var(--text)]">{item.title}</h4>
                                {item.description && <p className="text-sm text-[var(--text-muted)] mt-1">{item.description}</p>}
                                {item.location && <p className="text-xs text-[var(--accent)] mt-1">{item.location}</p>}
                                {item.notes && <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">{item.notes}</p>}
                              </div>
                              <button onClick={() => handleDeleteItem(item.id)} className="text-[var(--text-muted)] hover:text-red-500 text-sm">✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FLIGHT MODAL */}
      {showFlightModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowFlightModal(false)}>
          <div className="glass-card w-full max-w-md p-6 rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--text)]">My Flight Info</h2>
              <button onClick={() => setShowFlightModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Arrival</h3>
                <input type="datetime-local" value={flightForm.arrivalDatetime} onChange={(e) => setFlightForm({ ...flightForm, arrivalDatetime: e.target.value })} className="trips-input w-full mb-2" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={flightForm.arrivalFlightNumber} onChange={(e) => setFlightForm({ ...flightForm, arrivalFlightNumber: e.target.value })} placeholder="Flight # (AA123)" className="trips-input" />
                  <input type="text" value={flightForm.arrivalAirport} onChange={(e) => setFlightForm({ ...flightForm, arrivalAirport: e.target.value })} placeholder="Airport (LAX)" className="trips-input" />
                </div>
              </div>
              <div className="border-t border-[var(--border)] pt-4">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Departure</h3>
                <input type="datetime-local" value={flightForm.departureDatetime} onChange={(e) => setFlightForm({ ...flightForm, departureDatetime: e.target.value })} className="trips-input w-full mb-2" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={flightForm.departureFlightNumber} onChange={(e) => setFlightForm({ ...flightForm, departureFlightNumber: e.target.value })} placeholder="Flight # (AA456)" className="trips-input" />
                  <input type="text" value={flightForm.departureAirport} onChange={(e) => setFlightForm({ ...flightForm, departureAirport: e.target.value })} placeholder="Airport (LAX)" className="trips-input" />
                </div>
              </div>
              <button onClick={handleSaveFlight} className="btn-accent w-full mt-4">Save Flight Info</button>
            </div>
          </div>
        </div>
      )}

      {/* ACCOMMODATION MODAL */}
      {showAccommodationModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowAccommodationModal(false)}>
          <div className="glass-card w-full max-w-md p-6 rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--text)]">Add Accommodation</h2>
              <button onClick={() => setShowAccommodationModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl">×</button>
            </div>
            <div className="space-y-4">
              <input type="text" value={accommodationForm.name} onChange={(e) => setAccommodationForm({ ...accommodationForm, name: e.target.value })} placeholder="Name (e.g., Airbnb Downtown)" className="trips-input w-full" />
              <input type="text" value={accommodationForm.address} onChange={(e) => setAccommodationForm({ ...accommodationForm, address: e.target.value })} placeholder="Address" className="trips-input w-full" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Check-in</label>
                  <input type="date" value={accommodationForm.checkInDate} onChange={(e) => setAccommodationForm({ ...accommodationForm, checkInDate: e.target.value })} className="trips-input w-full" />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Check-out</label>
                  <input type="date" value={accommodationForm.checkOutDate} onChange={(e) => setAccommodationForm({ ...accommodationForm, checkOutDate: e.target.value })} className="trips-input w-full" />
                </div>
              </div>
              <button onClick={handleSaveAccommodation} className="btn-accent w-full">Add Accommodation</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ITEM MODAL */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowAddItemModal(false)}>
          <div className="glass-card w-full max-w-md p-6 rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--text)]">Add Activity</h2>
              <button onClick={() => setShowAddItemModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl">×</button>
            </div>
            <div className="space-y-4">
              <input type="date" value={newItemForm.dayDate} onChange={(e) => setNewItemForm({ ...newItemForm, dayDate: e.target.value })} className="trips-input w-full" />
              <input type="text" value={newItemForm.title} onChange={(e) => setNewItemForm({ ...newItemForm, title: e.target.value })} placeholder="Activity title" className="trips-input w-full" />
              <div className="grid grid-cols-2 gap-2">
                <input type="time" value={newItemForm.startTime} onChange={(e) => setNewItemForm({ ...newItemForm, startTime: e.target.value })} className="trips-input" placeholder="Start" />
                <input type="time" value={newItemForm.endTime} onChange={(e) => setNewItemForm({ ...newItemForm, endTime: e.target.value })} className="trips-input" placeholder="End" />
              </div>
              <input type="text" value={newItemForm.location} onChange={(e) => setNewItemForm({ ...newItemForm, location: e.target.value })} placeholder="Location (optional)" className="trips-input w-full" />
              <textarea value={newItemForm.description} onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })} placeholder="Notes (optional)" className="trips-input w-full" rows={2} />
              <button onClick={handleAddItineraryItem} className="btn-accent w-full">Add Activity</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
