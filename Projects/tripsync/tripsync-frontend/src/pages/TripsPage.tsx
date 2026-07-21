// src/pages/TripsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { useBackground } from "../context/BackgroundProvider";

type Trip = {
  id: number;
  name: string;
  destination: string | null;  // Now nullable!
  createdAtIso: string;
  memberCount?: number;
  role?: "organizer" | "member";
};

type CreateTripRequest = {
  name: string;
  destination: string | null;
  homeAirport: string;
};

type Theme = "light" | "dark";

const TRIP_EMOJIS = ["🏝️", "🏔️", "🌴", "✈️", "🗺️", "🌊", "🏕️", "🎒", "🌅", "🚀"];

function getRandomEmoji(seed: number): string {
  return TRIP_EMOJIS[seed % TRIP_EMOJIS.length];
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Created today";
  if (diffDays === 1) return "Created yesterday";
  if (diffDays < 7) return `Created ${diffDays} days ago`;
  if (diffDays < 30) return `Created ${Math.floor(diffDays / 7)} weeks ago`;
  return `Created ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="theme-toggle"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "☀️" : "🌙"} <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}

export function TripsPage() {
  const navigate = useNavigate();
  const { bgIndex, backgrounds } = useBackground();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("light");

  // Create-trip form state
  const [newName, setNewName] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [homeAirport, setHomeAirport] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await api<Trip[]>("/trips");
        if (!cancelled) setTrips(data);
      } catch (err: any) {
        console.error("Failed to fetch trips", err);
        if (!cancelled) setError(err.message || "Failed to load trips");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !homeAirport) return;

    try {
      setIsCreating(true);
      const body: CreateTripRequest = {
        name: newName,
        destination: newDestination.trim() || null,  // null if empty
        homeAirport,
      };

      const created = await api<Trip>("/trips", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setTrips((prev) => [created, ...prev]);
      setNewName("");
      setNewDestination("");
      setHomeAirport("");
      setShowAdvanced(false);

      navigate(`/trip/${created.id}`);
    } catch (err: any) {
      console.error("Create trip failed", err);
      alert(err.message || "Could not create trip");
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenTrip = (tripId: number) => {
    navigate(`/trip/${tripId}`);
  };

  // Only require name and home airport
  const canCreate = newName.trim() && homeAirport.trim();

  return (
    <div className="min-h-screen relative">
      {/* Rotating background images — fixed so they stay while scrolling */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {backgrounds.map((src, i) => (
          <div
            key={i}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms]"
            style={{ backgroundImage: `url(${src})`, opacity: i === bgIndex ? 1 : 0 }}
          />
        ))}
        {/* Light overlay so text stays readable */}
        <div className="absolute inset-0" style={{ background: "rgba(250,247,255,0.65)" }} />
      </div>
      {/* Header */}
      <header className="header-bar sticky top-0 z-50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="logo-mark">TS</div>
            <div className="flex flex-col">
              <span className="text-base font-semibold text-[var(--text)]">TripSync</span>
              <span className="text-xs text-[var(--text-muted)]">Where friends land on the same page</span>
            </div>
          </div>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </header>

      <main className="px-6 py-10">
        <div className="max-w-5xl mx-auto">
          {/* Welcome section */}
          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-2 text-[var(--text)]">
              Your trips <span className="inline-block animate-wave">✨</span>
            </h2>
            <p className="text-base text-[var(--text-muted)]">
              Jump back into a plan or spin up something new. Adventure awaits!
            </p>
          </div>

          {/* Create trip card */}
          <div className="glass-card p-8 mb-10">
            <div className="flex items-start gap-5">
              <div className="icon-badge bg-gradient-to-br from-emerald-400 to-teal-400 text-2xl flex-shrink-0 hover:scale-110 transition-transform cursor-default">
                ✈️
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1 text-[var(--text)]">
                  Start a new adventure
                </h3>
                <p className="text-sm mb-6 text-[var(--text-muted)]">
                  Give your trip a name and your home airport. Not sure where to go yet? 
                  That's okay—you can brainstorm destinations with your crew!
                </p>

                <form onSubmit={handleCreateTrip} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="input-wrapper">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Trip name"
                        className="trips-input w-full"
                      />
                      <span className="input-hint">e.g. Spring Break 2026, Besties Getaway</span>
                    </div>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        value={homeAirport}
                        onChange={(e) => setHomeAirport(e.target.value.toUpperCase())}
                        placeholder="Your home airport"
                        maxLength={3}
                        className="trips-input w-full uppercase"
                      />
                      <span className="input-hint">DFW, AUS, SFO…</span>
                    </div>
                  </div>

                  {/* Optional destination - expandable */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1"
                    >
                      {showAdvanced ? "▼" : "▶"} Already know where you're going?
                    </button>
                    
                    {showAdvanced && (
                      <div className="mt-3 input-wrapper">
                        <input
                          type="text"
                          value={newDestination}
                          onChange={(e) => setNewDestination(e.target.value)}
                          placeholder="Destination (optional)"
                          className="trips-input w-full"
                        />
                        <span className="input-hint">Leave blank to brainstorm with your crew</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!canCreate || isCreating}
                    className="btn-accent px-8 py-3 text-base"
                  >
                    {isCreating ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span> Creating…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>🚀</span> Create trip
                      </span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Trips list header */}
          {trips.length > 0 && (
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[var(--text)]">Your adventures</h3>
              <span className="text-sm px-3 py-1 rounded-full bg-[var(--accent-light)] text-[var(--accent)] font-medium">
                {trips.length} {trips.length === 1 ? "trip" : "trips"}
              </span>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="glass-card p-12 text-center">
              <div className="text-5xl mb-4 animate-float">✈️</div>
              <p className="text-[var(--text-muted)]">Loading your trips…</p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="glass-card p-8 text-center border-2 border-red-300 dark:border-red-500/30">
              <div className="text-4xl mb-4">😅</div>
              <p className="font-medium mb-2 text-[var(--text)]">Oops, something went wrong</p>
              <p className="text-sm text-[var(--text-muted)]">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && trips.length === 0 && (
            <div className="glass-card p-12 text-center">
              <div className="text-6xl mb-6">🗺️</div>
              <h3 className="text-xl font-semibold mb-2 text-[var(--text)]">
                No trips yet—let's change that!
              </h3>
              <p className="text-sm mb-6 max-w-md mx-auto text-[var(--text-muted)]">
                Every great adventure starts with a single step. Create your first trip above 
                and invite your crew to start planning together.
              </p>
              <button
                onClick={() => document.querySelector<HTMLInputElement>('.trips-input')?.focus()}
                className="btn-secondary"
              >
                ✨ Start planning
              </button>
            </div>
          )}

          {/* Trips grid */}
          {!loading && trips.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => handleOpenTrip(trip.id)}
                  className="trip-card group text-left"
                >
                  {/* Card top gradient accent */}
                  <div className="h-1.5 bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="icon-badge bg-gradient-to-br from-violet-500 to-purple-400 text-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                        {getRandomEmoji(trip.id)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-base truncate text-[var(--text)]">
                            {trip.name}
                          </h4>
                          {trip.role === "organizer" && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                              👑
                            </span>
                          )}
                        </div>
                        
                        {/* Destination or brainstorming badge */}
                        {trip.destination ? (
                          <p className="text-sm truncate text-[var(--text-muted)]">
                            📍 {trip.destination}
                          </p>
                        ) : (
                          <p className="text-sm text-[var(--accent)]">
                            🧠 Brainstorming destination...
                          </p>
                        )}
                        
                        {trip.memberCount && trip.memberCount > 1 && (
                          <p className="text-xs text-[var(--text-light)] mt-1">
                            👥 {trip.memberCount} travelers
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                      <span className="text-xs text-[var(--text-light)]">
                        {formatRelativeTime(trip.createdAtIso)}
                      </span>
                      <span className="text-xs font-medium text-[var(--accent)] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Open <span className="text-sm">→</span>
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-[var(--border)] text-center">
            <p className="text-sm text-[var(--text-light)]">
              Made with 💜 for adventurers everywhere
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
