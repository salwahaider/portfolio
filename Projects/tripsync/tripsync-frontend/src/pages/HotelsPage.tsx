// src/pages/HotelsPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../utils/api";

type Theme = "light" | "dark";

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

export default function HotelsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("tripsync-theme");
    return saved === "dark" || saved === "light" ? saved : "light";
  });

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
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
          <button
            className="sidebar-link"
            onClick={() => navigate(`/trip/${tripId}`)}
          >
            <span className="text-xl">🗺️</span>
            <span>Trip Board</span>
          </button>

          <button
            className="sidebar-link"
            onClick={() => navigate(`/trip/${tripId}/itinerary`)}
          >
            <span className="text-xl">📋</span>
            <span>Itinerary</span>
          </button>

          <button
            className="sidebar-link"
            onClick={() => navigate(`/trip/${tripId}/flights`)}
          >
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

          <button
            className="sidebar-link"
            onClick={() => navigate(`/trip/${tripId}/split-costs`)}
          >
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
                <h1 className="text-xl font-bold text-[var(--text)]">
                  {trip?.name || "…"}
                </h1>
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
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-accent"
                >
                  + Add hotel
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 max-w-5xl mx-auto w-full px-8 py-8">
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
              <h2 className="text-xl font-bold text-[var(--text)] mb-2">No accommodations yet</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Add your hotel, Airbnb, or any place the group is staying.
              </p>
              {canEdit ? (
                <button onClick={() => setShowAddModal(true)} className="btn-accent">
                  + Add first hotel
                </button>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">
                  Ask the trip organizer to add accommodations.
                </p>
              )}
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
      </div>

      {/* Add Hotel Modal */}
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
              <h2 className="text-lg font-bold text-[var(--text)]">Add Accommodation</h2>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  Name *
                </label>
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
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  Address *
                </label>
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
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">
                    Check-in date
                  </label>
                  <input
                    type="date"
                    value={form.checkInDate}
                    onChange={(e) => setForm({ ...form, checkInDate: e.target.value })}
                    className="trips-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">
                    Check-in time
                  </label>
                  <input
                    type="time"
                    value={form.checkInTime}
                    onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
                    className="trips-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">
                    Check-out date
                  </label>
                  <input
                    type="date"
                    value={form.checkOutDate}
                    onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })}
                    className="trips-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">
                    Check-out time
                  </label>
                  <input
                    type="time"
                    value={form.checkOutTime}
                    onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
                    className="trips-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  Notes (optional)
                </label>
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
                {saving ? "Saving…" : "Add Hotel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
