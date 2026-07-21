// src/pages/JoinTripPage.tsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { guestApi } from "../utils/api";

// ============================================
// TYPES
// ============================================
type Airport = {
  code: string;
  city: string;
  name: string;
  country?: string;
};

type InvitePreview = {
  tripId: number;
  tripName: string;
  destination: string;
  organizerName: string;
  memberCount: number;
};

type Theme = "light" | "dark";

// ============================================
// AIRPORTS DATABASE
// ============================================
const AIRPORTS_DATABASE: Airport[] = [
  { code: "DFW", city: "Dallas", name: "Dallas/Fort Worth International", country: "USA" },
  { code: "DAL", city: "Dallas", name: "Dallas Love Field", country: "USA" },
  { code: "AUS", city: "Austin", name: "Austin–Bergstrom International", country: "USA" },
  { code: "HNL", city: "Honolulu", name: "Honolulu International", country: "USA" },
  { code: "SFO", city: "San Francisco", name: "San Francisco International", country: "USA" },
  { code: "LAX", city: "Los Angeles", name: "Los Angeles International", country: "USA" },
  { code: "JFK", city: "New York", name: "John F. Kennedy International", country: "USA" },
  { code: "EWR", city: "Newark", name: "Newark Liberty International", country: "USA" },
  { code: "LGA", city: "New York", name: "LaGuardia Airport", country: "USA" },
  { code: "SEA", city: "Seattle", name: "Seattle–Tacoma International", country: "USA" },
  { code: "DEN", city: "Denver", name: "Denver International", country: "USA" },
  { code: "ORD", city: "Chicago", name: "O'Hare International", country: "USA" },
  { code: "MDW", city: "Chicago", name: "Midway International", country: "USA" },
  { code: "ATL", city: "Atlanta", name: "Hartsfield–Jackson", country: "USA" },
  { code: "MIA", city: "Miami", name: "Miami International", country: "USA" },
  { code: "FLL", city: "Fort Lauderdale", name: "Fort Lauderdale–Hollywood", country: "USA" },
  { code: "BOS", city: "Boston", name: "Logan International", country: "USA" },
  { code: "PHX", city: "Phoenix", name: "Sky Harbor International", country: "USA" },
  { code: "LAS", city: "Las Vegas", name: "Harry Reid International", country: "USA" },
  { code: "SAN", city: "San Diego", name: "San Diego International", country: "USA" },
  { code: "IAH", city: "Houston", name: "George Bush Intercontinental", country: "USA" },
  { code: "HOU", city: "Houston", name: "William P. Hobby", country: "USA" },
  { code: "MSP", city: "Minneapolis", name: "Minneapolis–Saint Paul", country: "USA" },
  { code: "DTW", city: "Detroit", name: "Detroit Metropolitan", country: "USA" },
  { code: "PHL", city: "Philadelphia", name: "Philadelphia International", country: "USA" },
  { code: "CLT", city: "Charlotte", name: "Charlotte Douglas", country: "USA" },
  { code: "BWI", city: "Baltimore", name: "Baltimore/Washington", country: "USA" },
  { code: "DCA", city: "Washington", name: "Reagan National", country: "USA" },
  { code: "IAD", city: "Washington", name: "Dulles International", country: "USA" },
  { code: "SLC", city: "Salt Lake City", name: "Salt Lake City International", country: "USA" },
  { code: "PDX", city: "Portland", name: "Portland International", country: "USA" },
  { code: "TPA", city: "Tampa", name: "Tampa International", country: "USA" },
  { code: "MCO", city: "Orlando", name: "Orlando International", country: "USA" },
  { code: "YYZ", city: "Toronto", name: "Toronto Pearson", country: "Canada" },
  { code: "YVR", city: "Vancouver", name: "Vancouver International", country: "Canada" },
  { code: "YUL", city: "Montreal", name: "Montréal–Trudeau", country: "Canada" },
  { code: "YYC", city: "Calgary", name: "Calgary International", country: "Canada" },
  { code: "LHR", city: "London", name: "Heathrow", country: "UK" },
  { code: "LGW", city: "London", name: "Gatwick", country: "UK" },
  { code: "CDG", city: "Paris", name: "Charles de Gaulle", country: "France" },
  { code: "AMS", city: "Amsterdam", name: "Schiphol", country: "Netherlands" },
  { code: "FRA", city: "Frankfurt", name: "Frankfurt Airport", country: "Germany" },
  { code: "MUC", city: "Munich", name: "Munich Airport", country: "Germany" },
  { code: "BCN", city: "Barcelona", name: "El Prat", country: "Spain" },
  { code: "MAD", city: "Madrid", name: "Barajas", country: "Spain" },
  { code: "FCO", city: "Rome", name: "Fiumicino", country: "Italy" },
  { code: "DXB", city: "Dubai", name: "Dubai International", country: "UAE" },
  { code: "SIN", city: "Singapore", name: "Changi Airport", country: "Singapore" },
  { code: "HKG", city: "Hong Kong", name: "Hong Kong International", country: "Hong Kong" },
  { code: "NRT", city: "Tokyo", name: "Narita International", country: "Japan" },
  { code: "HND", city: "Tokyo", name: "Haneda Airport", country: "Japan" },
  { code: "ICN", city: "Seoul", name: "Incheon International", country: "South Korea" },
  { code: "SYD", city: "Sydney", name: "Sydney Airport", country: "Australia" },
  { code: "MEL", city: "Melbourne", name: "Melbourne Airport", country: "Australia" },
  { code: "CUN", city: "Cancún", name: "Cancún International", country: "Mexico" },
  { code: "MEX", city: "Mexico City", name: "Benito Juárez", country: "Mexico" },
];

// ============================================
// MAIN COMPONENT
// ============================================
export function JoinTripPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [theme, setTheme] = useState<Theme>("light");
  const [step, setStep] = useState<"loading" | "enter-info" | "success" | "error">("loading");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [airportQuery, setAirportQuery] = useState("");
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Validate invite code on mount
  useEffect(() => {
    async function validateCode() {
      if (!inviteCode) {
        setError("No invite code provided");
        setStep("error");
        return;
      }

      try {
        const data = await guestApi<InvitePreview>(`/invite/${inviteCode}/preview`);
        setPreview(data);
        setStep("enter-info");
      } catch (err: any) {
        console.error("Invalid invite code", err);
        setError(err.message || "This invite link is invalid or has expired");
        setStep("error");
      }
    }

    validateCode();
  }, [inviteCode]);

  // Filter airports based on query
  const filteredAirports = airportQuery.length < 2
    ? []
    : AIRPORTS_DATABASE.filter((a) => {
        const q = airportQuery.toLowerCase();
        return (
          a.code.toLowerCase().startsWith(q) ||
          a.city.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.country?.toLowerCase().includes(q)
        );
      }).slice(0, 8);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [filteredAirports.length]);

  // Handle clicking outside dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectAirport = (airport: Airport) => {
    setSelectedAirport(airport);
    setAirportQuery(`${airport.city} (${airport.code})`);
    setShowDropdown(false);
  };

  const handleAirportKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filteredAirports.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredAirports.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredAirports.length) % filteredAirports.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelectAirport(filteredAirports[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !selectedAirport || !inviteCode) return;

    setIsSubmitting(true);

    try {
      // Use the guest join endpoint
      const response = await guestApi<{
        memberId: number;
        tripId: number;
        guest: boolean;
      }>(`/invite/${inviteCode}/join-guest`, {
        method: "POST",
        body: JSON.stringify({
          displayName: name.trim(),
          homeAirport: selectedAirport.code,
        }),
      });

      // Store guest member ID in localStorage
      localStorage.setItem(
        `guestMemberForTrip_${response.tripId}`,
        String(response.memberId)
      );

      setStep("success");

      // Redirect to trip dashboard after short delay
      setTimeout(() => {
        navigate(`/trip/${response.tripId}`);
      }, 1500);

    } catch (err: any) {
      console.error("Failed to join trip", err);
      setError(err.message || "Could not join this trip. Please try again.");
      setIsSubmitting(false);
    }
  };

  const canSubmit = name.trim().length >= 2 && selectedAirport !== null;

  return (
    <div className="min-h-screen page-gradient flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="logo-mark">TS</div>
            <div className="text-left">
              <h1 className="text-xl font-bold text-[var(--text)]">TripSync</h1>
              <p className="text-xs text-[var(--text-muted)]">Group travel made easy</p>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {step === "loading" && (
          <div className="glass-card p-8 text-center">
            <div className="text-5xl mb-4 animate-bounce">✈️</div>
            <p className="text-[var(--text-muted)]">Validating invite link…</p>
          </div>
        )}

        {/* Error state */}
        {step === "error" && (
          <div className="glass-card p-8 text-center">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-semibold mb-2 text-[var(--text)]">
              Oops!
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              {error}
            </p>
            <button
              onClick={() => navigate("/")}
              className="btn-secondary"
            >
              Go to homepage
            </button>
          </div>
        )}

        {/* Enter info form */}
        {step === "enter-info" && preview && (
          <div className="glass-card p-8">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-semibold text-[var(--text)] mb-1">
                You're invited!
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Join <span className="font-semibold text-[var(--accent)]">{preview.tripName}</span>
              </p>
              {preview.destination && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  📍 {preview.destination}
                </p>
              )}
              <p className="text-xs text-[var(--text-light)] mt-2">
                Organized by {preview.organizerName} · {preview.memberCount} {preview.memberCount === 1 ? "traveler" : "travelers"} joined
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name input */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  What should we call you?
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="trips-input w-full"
                  autoFocus
                  maxLength={50}
                />
              </div>

              {/* Airport autocomplete */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Where are you flying from?
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={airportQuery}
                  onChange={(e) => {
                    setAirportQuery(e.target.value);
                    setSelectedAirport(null);
                    setShowDropdown(true);
                  }}
                  onFocus={() => {
                    if (airportQuery.length >= 2) {
                      setShowDropdown(true);
                    }
                  }}
                  onKeyDown={handleAirportKeyDown}
                  placeholder="Search city or airport code…"
                  className="trips-input w-full"
                />
                
                {/* Selected indicator */}
                {selectedAirport && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-4">
                    <span className="text-emerald-500 text-lg">✓</span>
                  </div>
                )}
                
                {/* Dropdown */}
                {showDropdown && filteredAirports.length > 0 && (
                  <div className="absolute z-20 w-full mt-2 bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-lg overflow-hidden">
                    {filteredAirports.map((airport, i) => (
                      <button
                        key={airport.code}
                        type="button"
                        onClick={() => handleSelectAirport(airport)}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                          i === activeIndex
                            ? "bg-[var(--accent-light)]"
                            : "hover:bg-[var(--accent-light)]"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {airport.code}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--text)] text-sm truncate">
                            {airport.city}, {airport.country}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {airport.name}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Hint when no results */}
                {showDropdown && airportQuery.length >= 2 && filteredAirports.length === 0 && (
                  <div className="absolute z-20 w-full mt-2 bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-lg p-4 text-center">
                    <p className="text-sm text-[var(--text-muted)]">
                      No airports found for "{airportQuery}"
                    </p>
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="btn-accent w-full py-3 text-base"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span> Joining…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>🚀</span> Join trip
                  </span>
                )}
              </button>
            </form>

            {/* Sign in link for users with accounts */}
            <div className="mt-6 pt-6 border-t border-[var(--border)] text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Have an account?{" "}
                <button
                  onClick={() => navigate(`/login?invite=${inviteCode}`)}
                  className="text-[var(--accent)] hover:underline font-medium"
                >
                  Sign in first
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Success state */}
        {step === "success" && preview && (
          <div className="glass-card p-8 text-center">
            <div className="text-5xl mb-4">🎊</div>
            <h2 className="text-xl font-semibold mb-2 text-[var(--text)]">
              You're in!
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Welcome to <span className="font-medium">{preview.tripName}</span>
            </p>
            <p className="text-xs text-[var(--text-light)]">
              Redirecting to trip dashboard…
            </p>
          </div>
        )}

        {/* Theme toggle */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="theme-toggle"
          >
            {theme === "dark" ? "☀️" : "🌙"} {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </div>
    </div>
  );
}
