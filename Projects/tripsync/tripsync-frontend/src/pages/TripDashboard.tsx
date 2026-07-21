// src/pages/TripDashboard.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, guestApi } from "../utils/api";
import { AvailabilityHeatmap } from "../components/AvailabilityHeatmap";
import { DestinationVoting } from "../components/DestinationVoting";
import { BudgetTab } from "../components/BudgetTab";
import { IdeasBoard } from "../components/IdeasBoard";

// ============================================
// TYPES
// ============================================
type Airport = {
  code: string;
  city: string;
  name: string;
  country?: string;
};

type TripMember = {
  id: number;
  displayName: string;
  homeAirport: string | null;
  guest: boolean;
  creator: boolean;
  isCurrentUser: boolean;
};

type Trip = {
  id: number;
  name: string;
  destination: string;
  createdAtIso: string;
  photoAlbumUrl?: string | null;
};

type Theme = "light" | "dark";
type TabKey = "overview" | "ideas" | "calendar" | "budget";

// ============================================
// CONSTANTS
// ============================================
const AIRPORTS_DATABASE: Airport[] = [
  { code: "DFW", city: "Dallas", name: "Dallas/Fort Worth International", country: "USA" },
  { code: "DAL", city: "Dallas", name: "Dallas Love Field", country: "USA" },
  { code: "AUS", city: "Austin", name: "Austin–Bergstrom International", country: "USA" },
  { code: "HNL", city: "Honolulu", name: "Honolulu International", country: "USA" },
  { code: "SFO", city: "San Francisco", name: "San Francisco International", country: "USA" },
  { code: "LAX", city: "Los Angeles", name: "Los Angeles International", country: "USA" },
  { code: "JFK", city: "New York", name: "John F. Kennedy International", country: "USA" },
  { code: "SEA", city: "Seattle", name: "Seattle–Tacoma International", country: "USA" },
  { code: "DEN", city: "Denver", name: "Denver International", country: "USA" },
  { code: "ORD", city: "Chicago", name: "O'Hare International", country: "USA" },
  { code: "ATL", city: "Atlanta", name: "Hartsfield–Jackson", country: "USA" },
  { code: "MIA", city: "Miami", name: "Miami International", country: "USA" },
  { code: "BOS", city: "Boston", name: "Logan International", country: "USA" },
  { code: "PHX", city: "Phoenix", name: "Sky Harbor International", country: "USA" },
  { code: "LAS", city: "Las Vegas", name: "Harry Reid International", country: "USA" },
  { code: "YYZ", city: "Toronto", name: "Toronto Pearson", country: "Canada" },
  { code: "YVR", city: "Vancouver", name: "Vancouver International", country: "Canada" },
  { code: "LHR", city: "London", name: "Heathrow", country: "UK" },
  { code: "CDG", city: "Paris", name: "Charles de Gaulle", country: "France" },
  { code: "AMS", city: "Amsterdam", name: "Schiphol", country: "Netherlands" },
  { code: "FRA", city: "Frankfurt", name: "Frankfurt Airport", country: "Germany" },
  { code: "BCN", city: "Barcelona", name: "El Prat", country: "Spain" },
];

// Avatar colors for members
const AVATAR_COLORS = [
  "avatar-user",    // purple - for current user
  "avatar-coral",   // orange
  "avatar-pink",    // pink  
  "avatar-blue",    // blue
  "avatar-green",   // green
  "avatar-yellow",  // yellow
];

function getAvatarColor(index: number, isCurrentUser: boolean): string {
  if (isCurrentUser) return "avatar-user";
  return AVATAR_COLORS[(index % (AVATAR_COLORS.length - 1)) + 1];
}

function getAirportCity(code: string): string {
  const airport = AIRPORTS_DATABASE.find(a => a.code === code);
  return airport?.city || code;
}

// ============================================
// THEME TOGGLE COMPONENT
// ============================================
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

// ============================================
// TRAVEL SQUAD COMPONENT
// ============================================
function TravelSquad({ 
  tripId, 
  members, 
  loading, 
  isCreator,
  onSetAirport,
  onRefresh 
}: { 
  tripId: string;
  members: TripMember[];
  loading: boolean;
  isCreator: boolean;
  onSetAirport: () => void;
  onRefresh: () => void;
}) {
  const [showManageModal, setShowManageModal] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

  // Sort: current user first, then creator, then by name
  const sortedMembers = [...members].sort((a, b) => {
    if (a.isCurrentUser) return -1;
    if (b.isCurrentUser) return 1;
    if (a.creator) return -1;
    if (b.creator) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm("Are you sure you want to remove this member from the trip?")) {
      return;
    }

    setRemovingMemberId(memberId);
    try {
      await api(`/trips/${tripId}/members/${memberId}`, {
        method: "DELETE",
      });
      onRefresh();
    } catch (err: any) {
      console.error("Failed to remove member", err);
      alert(err.message || "Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const isTripCreator = members.some(
    (m) => m.creator && m.isCurrentUser
  );

  const participants = members.map((m) => ({
  name: m.displayName,
  initial: m.displayName?.[0]?.toUpperCase() || "?",
  isUser: m.isCurrentUser,
}));

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="icon-badge icon-badge-sky text-xl">👥</div>
          <h2 className="text-lg font-bold text-[var(--text)]">Travel Squad</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-shimmer flex items-center gap-3 p-3 rounded-2xl bg-[var(--card-border)]">
              <div className="w-10 h-10 rounded-xl bg-[var(--border)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-[var(--border)] rounded" />
                <div className="h-3 w-32 bg-[var(--border)] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  

  return (
    <>
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="icon-badge icon-badge-sky text-xl">👥</div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Travel Squad</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {members.length} {members.length === 1 ? "traveler" : "travelers"}
              </p>
            </div>
          </div>
          {isCreator && (
            <button 
              onClick={() => setShowManageModal(true)}
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              Manage
            </button>
          )}
        </div>

        <div className="space-y-3">
          {sortedMembers.map((member, index) => (
            <MemberCard
              key={member.id}
              member={member}
              index={index}
              onSetAirport={onSetAirport}
            />
          ))}
        </div>

        {/* Empty state - invite prompt */}
        {members.length <= 1 && (
          <div className="mt-4 p-4 rounded-xl bg-[var(--accent-light)] text-center">
            <p className="text-sm text-[var(--text-muted)]">
              Share your invite link to add friends! 🎉
            </p>
          </div>
        )}
      </div>

      {/* Manage Members Modal */}
      {showManageModal && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowManageModal(false)}
        >
          <div 
            className="glass-card w-full max-w-md p-6 rounded-3xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--text)]">Manage Squad</h2>
              <button
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl leading-none"
                onClick={() => setShowManageModal(false)}
              >
                ×
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {sortedMembers.map((member, index) => (
                <div 
                  key={member.id}
                  className={`rounded-2xl px-4 py-3 flex items-center justify-between ${
                    member.isCurrentUser || member.creator
                      ? "bg-[var(--accent-light)] border border-[var(--accent)]"
                      : "bg-[var(--card)] border border-[var(--card-border)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(index, member.isCurrentUser)}`}>
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text)]">
                        {member.displayName}
                        {member.isCurrentUser && <span className="text-[var(--text-muted)] font-normal"> (You)</span>}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {member.creator ? "👑 Organizer" : member.guest ? "Guest" : "Member"}
                      </p>
                    </div>
                  </div>

                  {/* Only show remove button for non-creator members */}
                  {isTripCreator && !member.creator && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingMemberId === member.id}
                      className="text-sm px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors disabled:opacity-50"
                    >
                      {removingMemberId === member.id ? "…" : "Remove"}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setShowManageModal(false)}
                className="btn-accent w-full"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================
// MEMBER CARD COMPONENT
// ============================================
function MemberCard({ 
  member, 
  index, 
  onSetAirport 
}: { 
  member: TripMember; 
  index: number;
  onSetAirport: () => void;
}) {
  const avatarColor = getAvatarColor(index, member.isCurrentUser);
  const initial = member.displayName.charAt(0).toUpperCase();
  const hasOrigin = member.homeAirport && member.homeAirport.length > 0 && member.homeAirport !== "UNKNOWN";
  const originDisplay = hasOrigin 
    ? `${getAirportCity(member.homeAirport!)} (${member.homeAirport})`
    : null;

  return (
    <div
      className={`rounded-2xl px-4 py-3 flex items-center justify-between transition-all ${
        member.isCurrentUser
          ? "bg-[var(--accent-light)] border border-[var(--accent)]"
          : "bg-[var(--card)] border border-[var(--card-border)]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm ${avatarColor}`}
          >
            {initial}
          </div>
          {/* Online indicator for non-current, non-guest users */}
          {!member.isCurrentUser && !member.guest && (
            <div className="online-indicator" />
          )}
          {/* Crown badge for creator - ALWAYS shown */}
          {member.creator && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-xs shadow-sm">
              👑
            </div>
          )}
          {/* Guest badge - only for non-creators */}
          {member.guest && !member.creator && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center text-xs shadow-sm">
              👤
            </div>
          )}
        </div>
        <div>
          <p className="font-medium text-[var(--text)]">
            {member.displayName}
            {member.isCurrentUser && (
              <span className="text-[var(--text-muted)] font-normal"> (You)</span>
            )}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {!hasOrigin && member.isCurrentUser ? (
              <button
                onClick={onSetAirport}
                className="text-[var(--accent)] hover:underline"
              >
                Set your origin
              </button>
            ) : !hasOrigin ? (
              <span className="text-[var(--text-light)]">Origin not set</span>
            ) : (
              <>From {originDisplay}</>
            )}
          </p>
        </div>
      </div>

      {/* Status label for non-current users */}
      {!member.isCurrentUser && (
        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
          {member.creator ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium">Organizer</span>
          ) : member.guest ? (
            "Guest"
          ) : (
            "Member"
          )}
        </span>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function TripDashboard() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  // Theme state - load from localStorage
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("tripsync-theme");
    return (saved === "dark" || saved === "light") ? saved : "light";
  });

  // Trip data
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [isAirportModalOpen, setIsAirportModalOpen] = useState(false);
  const [airportQuery, setAirportQuery] = useState("");
  const [activeAirportIndex, setActiveAirportIndex] = useState(0);
  
  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Editable trip name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [photoAlbumUrl, setPhotoAlbumUrl] = useState<string>("");
  const [photoInput, setPhotoInput] = useState<string>("");
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  type Insight = { type: string; icon: string; title: string; message: string };
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Current user's member record (for updating airport)
  const currentUserMember = members.find(m => m.isCurrentUser);
  
  // Check if current user is the trip creator
  const isCreator = currentUserMember?.creator ?? false;

  // you can invite if you're in the trip and not a guest
  const canInviteFriends = !!currentUserMember && !currentUserMember.guest;

  const participants = members.map((m) => ({
    name: m.displayName,
    initial: m.displayName?.[0]?.toUpperCase() || "?",
    isUser: m.isCurrentUser,
  }));

  // Apply theme and save to localStorage
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    localStorage.setItem("tripsync-theme", theme);
  }, [theme]);

  // Fetch trip data
  useEffect(() => {
    async function fetchTrip() {
      if (!tripId) return;
      
      try {
        setLoadingTrip(true);
        
        // Check if user is logged in or a guest
        const token = localStorage.getItem("authToken");
        const isGuest = !token;
        
        // Use guestApi for guests (no auth header, no redirect on 401)
        const data = isGuest 
          ? await guestApi<Trip>(`/trips/${tripId}`)
          : await api<Trip>(`/trips/${tripId}`);
        setTrip(data);
        setPhotoAlbumUrl(data.photoAlbumUrl || "");
        setPhotoInput(data.photoAlbumUrl || "");
      } catch (err: any) {
        console.error("Failed to fetch trip", err);
        setError(err.message || "Failed to load trip");
      } finally {
        setLoadingTrip(false);
      }
    }

    fetchTrip();
  }, [tripId]);

  // Fetch members
      const fetchMembers = async () => {
      if (!tripId) return;

      try {
        setLoadingMembers(true);

        const token = localStorage.getItem("authToken");
        const isGuest = !token;

        // Only care about guestMemberId if we're actually a guest
        const guestMemberId = isGuest
          ? localStorage.getItem(`guestMemberForTrip_${tripId}`)
          : null;

        let url = `/trips/${tripId}/members`;
        if (isGuest && guestMemberId) {
          url += `?guestMemberId=${guestMemberId}`;
        }

        const data = isGuest
          ? await guestApi<TripMember[]>(url)
          : await api<TripMember[]>(url);

        setMembers(data);
      } catch (err) {
        console.error("Failed to fetch members", err);
      } finally {
        setLoadingMembers(false);
      }
    };




  useEffect(() => {
    fetchMembers();
  }, [tripId]);

  // Invite URL for sharing
  const inviteUrl = inviteCode 
    ? `${window.location.origin}/join/${inviteCode}`
    : null;

  // Generate invite code
  const generateInviteCode = async () => {
    if (!tripId) return;
    
    setInviteLoading(true);
    try {
      const response = await api<{ code: string; tripId: number }>(
        `/invite/${tripId}/code`,
        { method: "POST" }
      );
      setInviteCode(response.code);
    } catch (err: any) {
      console.error("Failed to generate invite code", err);
      alert(err.message || "Failed to generate invite link");
    } finally {
      setInviteLoading(false);
    }
  };

  // Handle opening invite modal
  const handleOpenInviteModal = async () => {
    if (!inviteCode) {
      await generateInviteCode();
    }
    setIsInviteModalOpen(true);
  };

  // Copy invite link to clipboard
  const copyInviteLink = async () => {
    if (!inviteUrl) return;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }
  };

  // Save edited trip name
  const handleSaveTripName = async () => {
    if (!tripId || !editedName.trim() || editedName.trim() === trip?.name) {
      setIsEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      const updated = await api<Trip>(`/trips/${tripId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editedName.trim() }),
      });
      setTrip(updated);
      setIsEditingName(false);
    } catch (err: any) {
      console.error("Failed to update trip name", err);
      alert(err.message || "Failed to update trip name");
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePhotoAlbum = async () => {
    setSavingPhoto(true);
    try {
      await api(`/trips/${tripId}/photo-album`, {
        method: "PATCH",
        body: JSON.stringify({ photoAlbumUrl: photoInput.trim() || null }),
      });
      setPhotoAlbumUrl(photoInput.trim());
      setEditingPhoto(false);
    } catch (err: any) {
      alert(err.message || "Failed to save photo album link");
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleFetchInsights = async () => {
    setLoadingInsights(true);
    setInsightsError(null);
    try {
      const data = await api<{ insights: Insight[] }>(`/trips/${tripId}/ai-insights`);
      setInsights(data.insights);
    } catch (err: any) {
      let message = err.message || "Failed to load insights";
      try {
        const parsed = JSON.parse(message);
        if (parsed.error) message = parsed.error;
      } catch {}
      setInsightsError(message);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Start editing trip name
  const handleStartEditingName = () => {
    if (canEditTrip) {
      setEditedName(trip?.name || "");
      setIsEditingName(true);
    }
  };

  // Cancel editing trip name
  const handleCancelEditingName = () => {
    setIsEditingName(false);
    setEditedName("");
  };

  // Check if current user can edit trip (non-guest member)
  const canEditTrip = currentUserMember && !currentUserMember.guest;

  // Filter airports for search
  const filteredAirports = airportQuery.length < 2
    ? []
    : AIRPORTS_DATABASE.filter((a) => {
        const q = airportQuery.toLowerCase();
        return (
          a.code.toLowerCase().startsWith(q) ||
          a.city.toLowerCase().startsWith(q) ||
          a.name.toLowerCase().includes(q) ||
          a.country?.toLowerCase().includes(q)
        );
      }).slice(0, 8);

  // Handle airport selection
  const handleSelectAirport = async (airport: Airport) => {
    if (!currentUserMember || !tripId) return;

    try {
      // Update the member's home airport via API
      await api(`/trips/${tripId}/members/${currentUserMember.id}`, {
        method: "PATCH",
        body: JSON.stringify({ homeAirport: airport.code }),
      });

      // Refresh members list
      await fetchMembers();
      
      setIsAirportModalOpen(false);
      setAirportQuery("");
    } catch (err: any) {
      console.error("Failed to update airport", err);
      alert("Failed to update your airport. Please try again.");
    }
  };

  // Handle keyboard navigation in airport modal
  const handleAirportKeyDown = (e: React.KeyboardEvent) => {
    if (!filteredAirports.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveAirportIndex((prev) => (prev + 1) % filteredAirports.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveAirportIndex((prev) => (prev - 1 + filteredAirports.length) % filteredAirports.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelectAirport(filteredAirports[activeAirportIndex]);
    } else if (e.key === "Escape") {
      setIsAirportModalOpen(false);
      setAirportQuery("");
    }
  };

  // Compute origin label for insights
  const originLabel = currentUserMember?.homeAirport
    ? `${getAirportCity(currentUserMember.homeAirport)} (${currentUserMember.homeAirport})`
    : "your area";

  // Show origin prompt if current user hasn't set airport
  const shouldPromptForAirport = currentUserMember && !currentUserMember.homeAirport;

  // Loading state
  if (loadingTrip) {
    return (
      <div className="min-h-screen page-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-float">✈️</div>
          <p className="text-[var(--text-muted)]">Loading trip…</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !trip) {
    return (
      <div className="min-h-screen page-gradient flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-semibold mb-2 text-[var(--text)]">
            Trip not found
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            {error || "This trip doesn't exist or you don't have access."}
          </p>
          <button onClick={() => navigate("/trips")} className="btn-accent">
            Go to My Trips
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex page-gradient text-[var(--text)]">
      {/* ---------- SIDEBAR ---------- */}
      <aside className="sidebar w-72 flex flex-col shrink-0 border-r border-[var(--border)] bg-white/80 dark:bg-[#1a1a24] backdrop-blur-xl h-screen sticky top-0 overflow-y-auto">
        {/* Logo row */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <div className="sidebar-logo h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-bold">
            TS
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--text)]">TripSync</span>
            <span className="text-xs text-[var(--text-muted)]">Group travel made easy</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="mt-4 flex-1 space-y-2 px-4">
          <button className="sidebar-nav-active w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl">
            <span className="flex items-center gap-3">
              <span className="text-xl">🗺️</span>
              <span className="text-sm font-medium">Trip Board</span>
            </span>
            <span className="active-chip text-[10px] px-2 py-0.5 rounded-full">Active</span>
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

          <button
            className="sidebar-link"
            onClick={() => navigate(`/trip/${tripId}/hotels`)}
          >
            <span className="text-xl">🏨</span>
            <span>Hotels</span>
          </button>

          <button
            className="sidebar-link"
            onClick={() => navigate(`/trip/${tripId}/split-costs`)}
          >
            <span className="text-xl">💰</span>
            <span>Expenses</span>
          </button>
        </nav>

        {/* Bottom account chip */}
        <div className="px-4 pb-6 pt-2">
          <div className="account-chip flex items-center gap-3">
            <div className="account-avatar">
              {currentUserMember?.displayName.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[var(--text)]">
                {currentUserMember?.displayName || "Guest"}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {currentUserMember?.guest ? "Guest" : "Free plan"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ---------- MAIN COLUMN ---------- */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-[var(--border)] bg-[var(--panel)] backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/trips")}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
              >
                ← My Trips
              </button>
              <div className="h-6 w-px bg-[var(--border)]" />
              <div className="flex items-center gap-3">
                <div>
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveTripName();
                          if (e.key === "Escape") handleCancelEditingName();
                        }}
                        className="text-2xl font-bold bg-transparent border-b-2 border-[var(--accent)] outline-none text-[var(--text)] min-w-[200px]"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveTripName}
                        disabled={savingName}
                        className="p-1 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded"
                        title="Save"
                      >
                        {savingName ? "..." : "✓"}
                      </button>
                      <button
                        onClick={handleCancelEditingName}
                        className="p-1 text-[var(--text-muted)] hover:bg-[var(--card-border)] rounded"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <h1 
                      className={`text-xl font-bold text-[var(--text)] ${canEditTrip ? 'cursor-pointer hover:text-[var(--accent)] transition-colors' : ''}`}
                      onClick={handleStartEditingName}
                      title={canEditTrip ? "Click to edit trip name" : undefined}
                    >
                      {trip.name}
                    </h1>
                  )}
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>Planning phase</span>
                    <span>•</span>
                    <span>Trip ID: {tripId}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle theme={theme} setTheme={setTheme} />
              {canInviteFriends && (
                <button 
                  onClick={handleOpenInviteModal}
                  disabled={inviteLoading}
                  className="btn-accent"
                >
                  {inviteLoading ? "..." : "+ Invite friends"}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1">
          <div className="max-w-6xl mx-auto px-8 pt-6 space-y-6">
            {/* Origin prompt */}
            {shouldPromptForAirport && (
              <div className="glass-card flex items-center justify-between p-4 rounded-2xl border-l-4 border-l-[var(--accent)]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛫</span>
                  <div>
                    <p className="font-medium text-[var(--accent)]">Set your departure airport</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Tell us where you'll be flying from to see personalized prices.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAirportModalOpen(true)}
                  className="btn-accent"
                >
                  Set airport
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1 p-1 rounded-2xl shadow-sm bg-[var(--card)] border border-[var(--card-border)]">
                {([
                  ["overview", "Overview"],
                  ["ideas", "Ideas Board"],
                  ["calendar", "Availability"],
                  ["budget", "Budget"],
                ] as [TabKey, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      activeTab === key
                        ? "text-white bg-[var(--accent)] shadow-md"
                        : "text-[var(--text-muted)] hover:bg-[var(--accent-light)] hover:text-[var(--text)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* OVERVIEW TAB CONTENT */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
                  {/* LEFT COLUMN */}
                  <div className="space-y-6">
                    {/* Destination Voting */}
                    <DestinationVoting tripId={tripId!} />

                    {/* Planning Timeline */}
                    <div className="glass-card rounded-3xl p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="icon-badge icon-badge-amber text-xl">📋</div>
                        <div>
                          <h2 className="text-lg font-bold text-[var(--text)]">
                            Planning Timeline
                          </h2>
                          <p className="text-sm text-[var(--text-muted)]">
                            Key milestones to book this trip
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {/* Step 1 - Complete */}
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="timeline-step timeline-step-complete">✓</div>
                            <div className="w-0.5 h-14 bg-gradient-to-b from-emerald-400 to-cyan-400 mt-1" />
                          </div>
                          <div className="flex-1 pb-4">
                            <h4 className="font-semibold text-[var(--text)]">
                              Create trip & invite friends
                            </h4>
                            <p className="text-sm text-[var(--text-muted)] mt-0.5">
                              Trip created • {members.length}{" "}
                              {members.length === 1 ? "person" : "people"} joined
                            </p>
                          </div>
                        </div>

                        {/* Step 2 - Active */}
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="timeline-step timeline-step-active">2</div>
                            <div className="w-0.5 h-14 timeline-line-inactive mt-1" />
                          </div>
                          <div className="flex-1 pb-4">
                            <h4 className="font-semibold text-[var(--text)]">
                              Vote on destinations
                            </h4>
                            <p className="text-sm text-[var(--text-muted)] mt-0.5">
                              In progress • Ends in 5 days
                            </p>
                          </div>
                        </div>

                        {/* Step 3 - Upcoming */}
                        <div className="flex gap-4 opacity-60">
                          <div className="flex flex-col items-center">
                            <div className="timeline-step timeline-step-upcoming">3</div>
                            <div className="w-0.5 h-14 timeline-line-inactive mt-1" />
                          </div>
                          <div className="flex-1 pb-4">
                            <h4 className="font-medium text-[var(--text)]">
                              Check dates & availability
                            </h4>
                            <p className="text-sm text-[var(--text-muted)] mt-0.5">
                              Upcoming
                            </p>
                          </div>
                        </div>

                        {/* Step 4 - Future */}
                        <div className="flex gap-4 opacity-60">
                          <div className="flex flex-col items-center">
                            <div className="timeline-step timeline-step-upcoming">4</div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-[var(--text)]">
                              Book flights together
                            </h4>
                            <p className="text-sm text-[var(--text-muted)] mt-0.5">
                              Not started
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="space-y-6">
                    {/* Smart Insights */}
                    <div className="glass-card rounded-3xl p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <span className="text-2xl animate-pulse-slow">✨</span>
                        <h2 className="text-lg font-bold text-[var(--text)]">Smart Insights</h2>
                      </div>

                      <div className="space-y-4">
                        <div className="p-3 rounded-xl bg-[var(--accent-light)]">
                          <p className="text-sm">
                            <span className="font-semibold text-[var(--accent)]">
                              Best travel window:
                            </span>{" "}
                            <span className="text-[var(--text-muted)]">
                              March 8–12 based on group availability.
                            </span>
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10">
                          <p className="text-sm">
                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                              Price alert:
                            </span>{" "}
                            <span className="text-[var(--text-muted)]">
                              Flights from {originLabel} trending at ~$410 RT.
                            </span>
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                          <p className="text-sm">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Group consensus:
                            </span>{" "}
                            <span className="text-[var(--text-muted)]">
                              71% prefer beach destinations.
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Travel Squad */}
                    <TravelSquad
                      tripId={tripId!}
                      members={members}
                      loading={loadingMembers}
                      isCreator={isCreator}
                      onSetAirport={() => setIsAirportModalOpen(true)}
                      onRefresh={fetchMembers}
                    />

                    {/* Trip Photos */}
                    <div className="glass-card rounded-3xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="icon-badge icon-badge-sky text-xl">📸</div>
                          <div>
                            <h2 className="text-base font-bold text-[var(--text)]">Trip Photos</h2>
                            <p className="text-xs text-[var(--text-muted)]">Shared album for the group</p>
                          </div>
                        </div>
                        {canEditTrip && !editingPhoto && (
                          <button onClick={() => { setPhotoInput(photoAlbumUrl); setEditingPhoto(true); }}
                            className="text-xs text-[var(--accent)] hover:underline">
                            {photoAlbumUrl ? "Edit" : "Add link"}
                          </button>
                        )}
                      </div>

                      {editingPhoto ? (
                        <div className="space-y-3">
                          <p className="text-xs text-[var(--text-muted)]">Paste a shared Google Photos or iCloud album link. Everyone in the group can open it and add photos.</p>
                          <input
                            type="url"
                            value={photoInput}
                            onChange={e => setPhotoInput(e.target.value)}
                            placeholder="https://photos.google.com/share/..."
                            className="trips-input w-full text-sm"
                          />
                          <div className="flex gap-2">
                            <button onClick={handleSavePhotoAlbum} disabled={savingPhoto}
                              className="btn-accent text-xs px-4 py-2">
                              {savingPhoto ? "Saving…" : "Save"}
                            </button>
                            <button onClick={() => setEditingPhoto(false)}
                              className="text-xs px-4 py-2 rounded-xl border border-[var(--card-border)] text-[var(--text-muted)]">
                              Cancel
                            </button>
                          </div>
                          <p className="text-xs text-[var(--text-muted)]">
                            Create a shared album: <span className="text-[var(--accent)]">Google Photos → Library → Shared albums → New shared album</span>
                          </p>
                        </div>
                      ) : photoAlbumUrl ? (
                        <a href={photoAlbumUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--accent)] transition-colors group">
                          <span className="text-2xl">🖼️</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--accent)] truncate">Open shared album ↗</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">{photoAlbumUrl}</p>
                          </div>
                        </a>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-[var(--text-muted)] mb-3">No shared album yet.</p>
                          {canEditTrip ? (
                            <button onClick={() => setEditingPhoto(true)} className="text-sm text-[var(--accent)] hover:underline">
                              + Add a Google Photos or iCloud link
                            </button>
                          ) : (
                            <p className="text-xs text-[var(--text-muted)]">Ask the trip organizer to add a shared album.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* AI Insights */}
                    <div className="glass-card rounded-3xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="icon-badge icon-badge-amber text-xl">🤖</div>
                          <div>
                            <h2 className="text-base font-bold text-[var(--text)]">AI Insights</h2>
                            <p className="text-xs text-[var(--text-muted)]">Smart alerts based on your trip data</p>
                          </div>
                        </div>
                        {canEditTrip ? (
                          <button onClick={handleFetchInsights} disabled={loadingInsights}
                            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white disabled:opacity-50 hover:opacity-90 transition-opacity">
                            {loadingInsights ? "Thinking…" : insights.length > 0 ? "Refresh" : "Generate"}
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">Sign in to generate</span>
                        )}
                      </div>

                      {insightsError && (
                        <p className="text-xs text-red-500">{insightsError}</p>
                      )}

                      {!loadingInsights && insights.length === 0 && !insightsError && (
                        <div className="text-center py-4">
                          <p className="text-sm text-[var(--text-muted)]">Click Generate to get AI-powered alerts based on your group's availability, budget, and flights.</p>
                        </div>
                      )}

                      {loadingInsights && (
                        <div className="space-y-2">
                          {[1,2,3,4].map(i => (
                            <div key={i} className="animate-pulse h-14 rounded-xl bg-[var(--card-border)]" />
                          ))}
                        </div>
                      )}

                      {!loadingInsights && insights.length > 0 && (
                        <div className="space-y-2">
                          {insights.map((insight, i) => {
                            const colors: Record<string, string> = {
                              availability: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
                              budget: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                              flights: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
                              tip: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
                            };
                            const colorClass = colors[insight.type] || colors.tip;
                            return (
                              <div key={i} className={`p-3 rounded-xl border ${colorClass}`}>
                                <div className="flex items-start gap-2">
                                  <span className="text-lg shrink-0">{insight.icon}</span>
                                  <div>
                                    <p className="text-sm font-semibold text-[var(--text)]">{insight.title}</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{insight.message}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Quick actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <button className="quick-action-card">
                        <span className="text-2xl mb-2 block">📊</span>
                        <span className="text-sm font-medium text-[var(--text)]">
                          View poll results
                        </span>
                      </button>
                      <button className="quick-action-card">
                        <span className="text-2xl mb-2 block">💬</span>
                        <span className="text-sm font-medium text-[var(--text)]">
                          Group chat
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* AVAILABILITY TAB CONTENT */}
              {activeTab === "calendar" && tripId && (
                <div className="pb-10">
                  <AvailabilityHeatmap tripId={tripId} participants={participants} />
                </div>
              )}
              {/* IDEAS BOARD TAB CONTENT */}
              {activeTab === "ideas" && tripId && (
                <div className="pb-10">
                  <IdeasBoard 
                    tripId={tripId} 
                    members={members.map(m => ({ 
                      id: m.id, 
                      displayName: m.displayName,
                      isCurrentUser: m.isCurrentUser 
                    }))} 
                  />
                </div>
              )}
              {/* BUDGET TAB CONTENT */}
              {activeTab === "budget" && tripId && (
                <div className="pb-10">
                  <BudgetTab 
                    tripId={tripId} 
                  />
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Airport Modal */}
      {isAirportModalOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setIsAirportModalOpen(false)}
        >
          <div 
            className="glass-card w-full max-w-lg p-6 rounded-3xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--text)]">Select your departure airport</h2>
              <button
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl leading-none"
                onClick={() => setIsAirportModalOpen(false)}
              >
                ×
              </button>
            </div>

            <input
              type="text"
              value={airportQuery}
              onChange={(e) => {
                setAirportQuery(e.target.value);
                setActiveAirportIndex(0);
              }}
              onKeyDown={handleAirportKeyDown}
              placeholder="Search by city, code, or airport name…"
              className="w-full p-3 rounded-xl mb-4 text-sm border border-[var(--border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text)]"
              autoFocus
            />

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredAirports.length === 0 && airportQuery.length > 1 && (
                <p className="text-sm text-[var(--text-muted)] px-1 py-4 text-center">
                  No airports found for "{airportQuery}"
                </p>
              )}
              {filteredAirports.length === 0 && airportQuery.length <= 1 && (
                <p className="text-sm text-[var(--text-muted)] px-1 py-4 text-center">
                  Start typing to search airports…
                </p>
              )}
              {filteredAirports.map((airport, i) => (
                <button
                  key={airport.code}
                  onClick={() => handleSelectAirport(airport)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                    i === activeAirportIndex
                      ? "bg-[var(--accent-light)] border border-[var(--accent)]"
                      : "hover:bg-[var(--accent-light)] border border-transparent"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center font-bold text-sm">
                    {airport.code}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text)]">{airport.city}, {airport.country}</p>
                    <p className="text-xs text-[var(--text-muted)]">{airport.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && inviteCode && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setIsInviteModalOpen(false)}
        >
          <div 
            className="glass-card w-full max-w-md p-6 rounded-3xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="icon-badge icon-badge-violet text-xl">🔗</div>
                <h2 className="text-lg font-bold text-[var(--text)]">Invite Friends</h2>
              </div>
              <button
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl leading-none"
                onClick={() => setIsInviteModalOpen(false)}
              >
                ×
              </button>
            </div>

            {/* Invite URL display */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Share this link to invite friends
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteUrl || ""}
                  readOnly
                  className="trips-input flex-1 text-sm font-mono"
                />
                <button
                  onClick={copyInviteLink}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    inviteCopied
                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-[var(--accent)] text-white hover:opacity-90"
                  }`}
                >
                  {inviteCopied ? "✓" : "Copy"}
                </button>
              </div>
            </div>

            {/* Share options */}
            <div className="space-y-3">
              {/* Copy link */}
              <button
                onClick={copyInviteLink}
                className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] hover:bg-[var(--accent-light)] transition-colors flex items-center gap-3"
              >
                <span className="text-xl">📋</span>
                <span className="font-medium text-[var(--text)]">Copy link</span>
                {inviteCopied && (
                  <span className="ml-auto text-sm text-emerald-500">Copied!</span>
                )}
              </button>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Join my trip "${trip?.name}" on TripSync! ${inviteUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] hover:bg-[var(--accent-light)] transition-colors flex items-center gap-3"
              >
                <span className="text-xl">💬</span>
                <span className="font-medium text-[var(--text)]">Share via WhatsApp</span>
              </a>

              {/* Text Message */}
              <a
                href={`sms:?body=${encodeURIComponent(`Join my trip "${trip?.name}" on TripSync! ${inviteUrl}`)}`}
                className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] hover:bg-[var(--accent-light)] transition-colors flex items-center gap-3"
              >
                <span className="text-xl">📱</span>
                <span className="font-medium text-[var(--text)]">Share via Text</span>
              </a>

              {/* Email */}
              <a
                href={`mailto:?subject=${encodeURIComponent(`Join my trip: ${trip?.name}`)}&body=${encodeURIComponent(`Hey!\n\nI'm planning a trip and want you to join.\n\nClick here to join: ${inviteUrl}`)}`}
                className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] hover:bg-[var(--accent-light)] transition-colors flex items-center gap-3"
              >
                <span className="text-xl">✉️</span>
                <span className="font-medium text-[var(--text)]">Share via Email</span>
              </a>
            </div>

            {/* Invite code display */}
            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)] text-center">
                Invite code: <span className="font-mono font-medium">{inviteCode}</span>
                <span className="mx-2">•</span>
                <span className="text-[var(--text-light)]">Expires in 30 days</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
