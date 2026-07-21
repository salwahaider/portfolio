// src/pages/HotelsPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../utils/api";

type Theme = "light" | "dark";
type Tab = "search" | "saved";

interface Trip {
  id: number;
  name: string;
  destination: string;
}

interface TripMember {
  id: number;
  displayName: string;
  guest: boolean;
  creator: boolean;
  isCurrentUser: boolean;
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

interface HotelResult {
  name: string;
  description: string | null;
  link: string | null;
  thumbnail: string | null;
  rating: number | null;
  reviewCount: number | null;
  hotelClass: string | null;
  pricePerNight: number | null;
  priceDisplay: string | null;
  totalPrice: number | null;
  totalPriceDisplay: string | null;
  amenities: string[];
  essentialInfo: string[];
  checkInTime: string | null;
  checkOutTime: string | null;
  latitude: number | null;
  longitude: number | null;
}

export default function HotelsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("tripsync-theme");
    return saved === "dark" || saved === "light" ? saved : "light";
  });

  const [tab, setTab] = useState<Tab>("search");
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCheckIn, setSearchCheckIn] = useState("");
  const [searchCheckOut, setSearchCheckOut] = useState("");
  const [searchAdults, setSearchAdults] = useState(2);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<HotelResult[]>([]);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "",
    address: "",
    checkInDate: "",
    checkInTime: "",
    checkOutDate: "",
    checkOutTime: "",
    notes: "",
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    localStorage.setItem("tripsync-theme", theme);
  }, [theme]);

  const fetchData = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const [tripData, membersData, accData] = await Promise.all([
        api<Trip>(`/trips/${tripId}`),
        api<TripMember[]>(`/trips/${tripId}/members`),
        api<Accommodation[]>(`/trips/${tripId}/accommodations`),
      ]);
      setTrip(tripData);
      setMembers(membersData);
      setAccommodations(accData);
      // Pre-fill search query from trip destination
      if (tripData.destination && !searchQuery) {
        setSearchQuery(`hotels in ${tripData.destination}`);
      }
    } catch (err: any) {
      console.error("Failed to load hotels data", err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentUser = members.find((m) => m.isCurrentUser);
  const canEdit = currentUser && !currentUser.guest;

  const resetForm = () =>
    setForm({ name: "", address: "", checkInDate: "", checkInTime: "", checkOutDate: "", checkOutTime: "", notes: "" });

  const openAddModal = (prefill?: Partial<typeof form>) => {
    resetForm();
    if (prefill) setForm((f) => ({ ...f, ...prefill }));
    setShowAddModal(true);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError("");
    setSearchResults([]);
    setHasSearched(true);
    try {
      const results = await api<HotelResult[]>(`/trips/${tripId}/hotels/search`, {
        method: "POST",
        body: JSON.stringify({
          query: searchQuery.trim(),
          checkIn: searchCheckIn || null,
          checkOut: searchCheckOut || null,
          adults: searchAdults,
        }),
      });
      setSearchResults(results);
    } catch (err: any) {
      setSearchError(err.message || "Hotel search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.address.trim()) {
      alert("Please enter the hotel name and address.");
      return;
    }
    setSaving(true);
    try {
      await api(`/trips/${tripId}/accommodations`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim(),
          checkInDate: form.checkInDate || null,
          checkInTime: form.checkInTime || null,
          checkOutDate: form.checkOutDate || null,
          checkOutTime: form.checkOutTime || null,
          notes: form.notes.trim() || null,
        }),
      });
      resetForm();
      setShowAddModal(false);
      await fetchData();
      setTab("saved");
    } catch (err: any) {
      alert(err.message || "Failed to save accommodation");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove "${name}"?`)) return;
    setDeletingId(id);
    try {
      await api(`/trips/${tripId}/accommodations/${id}`, { method: "DELETE" });
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
  };

  const getNights = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return null;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const nights = Math.round(diff / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : null;
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return (
      <span className="text-yellow-400 text-sm">
        {"★".repeat(full)}{half ? "½" : ""}
        <span className="text-[var(--text-muted)] ml-1 font-normal">{rating.toFixed(1)}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen flex page-gradient text-[var(--text)]">
      {/* Sidebar */}
      <aside className="sidebar w-72 flex flex-col shrink-0 border-r border-[var(--border)] bg-white/80 dark:bg-[#1a1a24] backdrop-blur-xl h-screen sticky top-0 overflow-y-auto">
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <div className="sidebar-logo h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-bold">
            TS
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--text)]">TripSync</span>
            <span className="text-xs text-[var(--text-muted)]">Group travel made easy</span>
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-2 px-4">
          <button className="sidebar-link" onClick={() => navigate(`/trip/${tripId}`)}>
            <span className="text-xl">🗺️</span>
            <span>Trip Board</span>
          </button>
          <button className="sidebar-link" onClick={() => navigate(`/trip/${tripId}/itinerary`)}>
            <span className="text-xl">📋</span>
            <span>Itinerary</span>
          </button>
          <button className="sidebar-link" onClick={() => navigate(`/trip/${tripId}/flights`)}>
            <span className="text-xl">✈️</span>
            <span>Flights</span>
          </button>
          <button className="sidebar-nav-active w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl">
            <span className="flex items-center gap-3">
              <span className="text-xl">🏨</span>
              <span className="text-sm font-medium">Hotels</span>
            </span>
            <span className="active-chip text-[10px] px-2 py-0.5 rounded-full">Active</span>
          </button>
          <button className="sidebar-link" onClick={() => navigate(`/trip/${tripId}/split-costs`)}>
            <span className="text-xl">💰</span>
            <span>Expenses</span>
          </button>
        </nav>

        <div className="px-4 pb-6 pt-2">
          <div className="account-chip flex items-center gap-3">
            <div className="account-avatar">
              {currentUser?.displayName.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[var(--text)]">
                {currentUser?.displayName || "Guest"}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {currentUser?.guest ? "Guest" : "Free plan"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-[var(--border)] bg-[var(--panel)] backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/trip/${tripId}`)}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
              >
                ← Trip Board
              </button>
              <div className="h-6 w-px bg-[var(--border)]" />
              <div>
                <h1 className="text-xl font-bold text-[var(--text)]">{trip?.name || "…"}</h1>
                <p className="text-xs text-[var(--text-muted)]">Hotels & Accommodations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="theme-toggle"
              >
                {theme === "dark" ? "☀️" : "🌙"}{" "}
                <span>{theme === "dark" ? "Light" : "Dark"}</span>
              </button>
              {canEdit && (
                <button onClick={() => openAddModal()} className="btn-accent">
                  + Add manually
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b border-[var(--border)] bg-[var(--panel)]">
          <div className="max-w-5xl mx-auto px-8 flex gap-1">
            {(["search", "saved"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {t === "search" ? "🔍 Search Hotels" : `🏨 Saved (${accommodations.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-5xl mx-auto w-full px-8 py-8">

          {/* ── Search Tab ── */}
          {tab === "search" && (
            <div className="space-y-6">
              {/* Search form */}
              <div className="glass-card rounded-3xl p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                      Destination or hotel name
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder={`Hotels in ${trip?.destination || "Paris"}`}
                      className="trips-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Check-in</label>
                    <input
                      type="date"
                      value={searchCheckIn}
                      onChange={(e) => setSearchCheckIn(e.target.value)}
                      className="trips-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Check-out</label>
                    <input
                      type="date"
                      value={searchCheckOut}
                      onChange={(e) => setSearchCheckOut(e.target.value)}
                      className="trips-input w-full"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-[var(--text-muted)]">Guests</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSearchAdults(Math.max(1, searchAdults - 1))}
                        className="w-7 h-7 rounded-full border border-[var(--border)] flex items-center justify-center text-sm hover:bg-[var(--accent-light)] transition-colors"
                      >−</button>
                      <span className="w-6 text-center text-sm font-medium">{searchAdults}</span>
                      <button
                        onClick={() => setSearchAdults(Math.min(10, searchAdults + 1))}
                        className="w-7 h-7 rounded-full border border-[var(--border)] flex items-center justify-center text-sm hover:bg-[var(--accent-light)] transition-colors"
                      >+</button>
                    </div>
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="btn-accent px-8"
                  >
                    {searching ? "Searching…" : "Search"}
                  </button>
                </div>
              </div>

              {/* Error */}
              {searchError && (
                <div className="glass-card rounded-2xl p-4 border border-red-200 dark:border-red-900">
                  <p className="text-sm text-red-600 dark:text-red-400">{searchError}</p>
                </div>
              )}

              {/* Loading skeleton */}
              {searching && (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-card rounded-3xl p-5 flex gap-4 animate-pulse">
                      <div className="w-24 h-24 rounded-2xl bg-[var(--card-border)] shrink-0" />
                      <div className="flex-1 space-y-3 py-1">
                        <div className="h-5 w-48 bg-[var(--card-border)] rounded" />
                        <div className="h-4 w-32 bg-[var(--card-border)] rounded" />
                        <div className="h-4 w-64 bg-[var(--card-border)] rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No results */}
              {!searching && hasSearched && searchResults.length === 0 && !searchError && (
                <div className="glass-card rounded-3xl p-12 text-center">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-[var(--text-muted)]">No hotels found. Try a different search query.</p>
                </div>
              )}

              {/* Empty state before first search */}
              {!searching && !hasSearched && (
                <div className="glass-card rounded-3xl p-12 text-center">
                  <div className="text-5xl mb-4">🏨</div>
                  <h2 className="text-xl font-bold text-[var(--text)] mb-2">Find hotels for your trip</h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Search for hotels and save them directly to your trip.
                  </p>
                </div>
              )}

              {/* Results */}
              {!searching && searchResults.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--text-muted)]">
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
                    {searchCheckIn && searchCheckOut
                      ? ` · ${getNights(searchCheckIn, searchCheckOut) ?? "?"} nights`
                      : ""}
                  </p>
                  {searchResults.map((hotel, idx) => (
                    <div key={idx} className="glass-card rounded-3xl p-5 flex gap-4">
                      {/* Thumbnail */}
                      {hotel.thumbnail ? (
                        <img
                          src={hotel.thumbnail}
                          alt={hotel.name}
                          className="w-24 h-24 rounded-2xl object-cover shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30 flex items-center justify-center text-3xl shrink-0">
                          🏨
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-bold text-[var(--text)] text-base leading-tight">
                              {hotel.name}
                            </h3>
                            {hotel.hotelClass && (
                              <p className="text-xs text-[var(--text-muted)] mt-0.5">{hotel.hotelClass}</p>
                            )}
                          </div>
                          {/* Price */}
                          <div className="text-right shrink-0">
                            {hotel.pricePerNight ? (
                              <>
                                <div className="text-lg font-bold text-[var(--accent)]">
                                  {hotel.priceDisplay ?? `$${Math.round(hotel.pricePerNight)}`}
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">per night</div>
                                {hotel.totalPriceDisplay && (
                                  <div className="text-xs text-[var(--text-muted)]">
                                    {hotel.totalPriceDisplay} total
                                  </div>
                                )}
                              </>
                            ) : null}
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {renderStars(hotel.rating)}
                          {hotel.reviewCount && (
                            <span className="text-xs text-[var(--text-muted)]">
                              {hotel.reviewCount.toLocaleString()} reviews
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {hotel.description && (
                          <p className="text-xs text-[var(--text-muted)] mt-1.5 line-clamp-2">
                            {hotel.description}
                          </p>
                        )}

                        {/* Amenities */}
                        {hotel.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {hotel.amenities.slice(0, 5).map((a) => (
                              <span
                                key={a}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent)]"
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Essential info */}
                        {hotel.essentialInfo.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {hotel.essentialInfo.map((info) => (
                              <span key={info} className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                                ✓ {info}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          {hotel.link && (
                            <a
                              href={hotel.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-3 py-1.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors"
                            >
                              View on Google Hotels ↗
                            </a>
                          )}
                          {canEdit && (
                            <button
                              onClick={() =>
                                openAddModal({
                                  name: hotel.name,
                                  checkInDate: searchCheckIn,
                                  checkOutDate: searchCheckOut,
                                })
                              }
                              className="text-xs px-3 py-1.5 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
                            >
                              + Save to trip
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Saved Tab ── */}
          {tab === "saved" && (
            <div>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="glass-card rounded-3xl p-6 animate-pulse">
                      <div className="h-5 w-48 bg-[var(--card-border)] rounded mb-3" />
                      <div className="h-4 w-64 bg-[var(--card-border)] rounded mb-2" />
                      <div className="h-4 w-40 bg-[var(--card-border)] rounded" />
                    </div>
                  ))}
                </div>
              ) : accommodations.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center">
                  <div className="text-5xl mb-4">🏨</div>
                  <h2 className="text-xl font-bold text-[var(--text)] mb-2">No accommodations saved yet</h2>
                  <p className="text-sm text-[var(--text-muted)] mb-6">
                    Search for hotels and save them, or add one manually.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setTab("search")} className="btn-accent">
                      Search hotels
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => openAddModal()}
                        className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                      >
                        Add manually
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {accommodations.map((acc) => {
                    const nights = getNights(acc.checkInDate, acc.checkOutDate);
                    return (
                      <div key={acc.id} className="glass-card rounded-3xl p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30 flex items-center justify-center text-2xl flex-shrink-0">
                              🏨
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-[var(--text)] text-lg truncate">{acc.name}</h3>
                              <p className="text-sm text-[var(--text-muted)] truncate">{acc.address}</p>

                              {(acc.checkInDate || acc.checkOutDate) && (
                                <div className="flex items-center gap-3 mt-3 flex-wrap">
                                  {acc.checkInDate && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-[var(--text-muted)]">Check-in</span>
                                      <span className="font-medium text-[var(--text)]">
                                        {formatDate(acc.checkInDate)}
                                        {acc.checkInTime && (
                                          <span className="text-[var(--text-muted)] font-normal"> at {acc.checkInTime}</span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {acc.checkInDate && acc.checkOutDate && (
                                    <span className="text-[var(--text-muted)]">→</span>
                                  )}
                                  {acc.checkOutDate && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-[var(--text-muted)]">Check-out</span>
                                      <span className="font-medium text-[var(--text)]">
                                        {formatDate(acc.checkOutDate)}
                                        {acc.checkOutTime && (
                                          <span className="text-[var(--text-muted)] font-normal"> at {acc.checkOutTime}</span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {nights && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent)] font-medium">
                                      {nights} night{nights !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                              )}

                              {acc.notes && (
                                <p className="mt-2 text-sm text-[var(--text-muted)] italic">{acc.notes}</p>
                              )}
                            </div>
                          </div>

                          {canEdit && (
                            <button
                              onClick={() => handleDelete(acc.id, acc.name)}
                              disabled={deletingId === acc.id}
                              className="shrink-0 p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors disabled:opacity-50"
                              title="Remove"
                            >
                              {deletingId === acc.id ? "…" : "✕"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add / Save Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => { setShowAddModal(false); resetForm(); }}
        >
          <div
            className="glass-card w-full max-w-md p-6 rounded-3xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--text)]">Save Accommodation</h2>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Airbnb Downtown, Marriott Hotel"
                  className="trips-input w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Address *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main St, City, State"
                  className="trips-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Check-in date</label>
                  <input
                    type="date"
                    value={form.checkInDate}
                    onChange={(e) => setForm({ ...form, checkInDate: e.target.value })}
                    className="trips-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Check-in time</label>
                  <input
                    type="time"
                    value={form.checkInTime}
                    onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
                    className="trips-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Check-out date</label>
                  <input
                    type="date"
                    value={form.checkOutDate}
                    onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })}
                    className="trips-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Check-out time</label>
                  <input
                    type="time"
                    value={form.checkOutTime}
                    onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
                    className="trips-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Parking info, check-in instructions, etc."
                  rows={2}
                  className="trips-input w-full resize-none"
                />
              </div>

              <button
                onClick={handleAdd}
                disabled={saving || !form.name.trim() || !form.address.trim()}
                className="btn-accent w-full mt-2"
              >
                {saving ? "Saving…" : "Save to Trip"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
