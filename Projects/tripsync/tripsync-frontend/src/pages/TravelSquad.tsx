// src/components/TravelSquad.tsx
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import type { TripMember, Airport } from "../types/trip";
import { getAvatarColor, getMemberInitial, formatOrigin } from "../types/trip";

type Props = {
  tripId: number;
  onSetAirport: () => void;  // callback to open airport modal
};

export function TravelSquad({ tripId, onSetAirport }: Props) {
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch members on mount and when tripId changes
  useEffect(() => {
    async function fetchMembers() {
      try {
        setLoading(true);
        const data = await api<TripMember[]>(`/trips/${tripId}/members`);
        setMembers(data);
      } catch (err: any) {
        console.error("Failed to fetch members", err);
        setError(err.message || "Failed to load squad");
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [tripId]);

  // Sort members: current user first, then organizer, then by join date
  const sortedMembers = [...members].sort((a, b) => {
    if (a.isCurrentUser) return -1;
    if (b.isCurrentUser) return 1;
    if (a.role === "organizer") return -1;
    if (b.role === "organizer") return 1;
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
  });

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="icon-badge icon-badge-sky text-xl">👥</div>
          <h2 className="text-lg font-bold text-[var(--text)]">Travel Squad</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-2xl bg-[var(--card-border)]">
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

  if (error) {
    return (
      <div className="glass-card rounded-3xl p-6">
        <div className="text-center py-4">
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
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
        <button className="text-sm font-medium text-[var(--accent)] hover:underline">
          Manage
        </button>
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

      {/* Empty state if no members besides current user */}
      {members.length <= 1 && (
        <div className="mt-4 p-4 rounded-xl bg-[var(--accent-light)] text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Share your invite link to add friends!
          </p>
        </div>
      )}
    </div>
  );
}

// Individual member card component
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
  const initial = member.isCurrentUser ? "You" : getMemberInitial(member.name);
  const origin = formatOrigin(member.originAirport, member.originCity);
  const needsOrigin = !member.originAirport;

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
          {/* Online indicator for non-current users */}
          {!member.isCurrentUser && member.status === "joined" && (
            <div className="online-indicator" />
          )}
          {/* Role badge for organizer */}
          {member.role === "organizer" && !member.isCurrentUser && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-[8px]">
              👑
            </div>
          )}
        </div>
        <div>
          <p className="font-medium text-[var(--text)]">
            {member.name}
            {member.isCurrentUser && (
              <span className="text-[var(--text-muted)] font-normal"> (You)</span>
            )}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {needsOrigin && member.isCurrentUser ? (
              <button
                onClick={onSetAirport}
                className="text-[var(--accent)] hover:underline"
              >
                Set your origin
              </button>
            ) : needsOrigin ? (
              <span className="text-[var(--text-light)]">Origin not set</span>
            ) : (
              <>From {origin}</>
            )}
          </p>
        </div>
      </div>

      {/* Status for non-current users */}
      {!member.isCurrentUser && (
        <span className="text-xs text-[var(--text-muted)]">
          {member.status === "pending" ? "Pending" : getStatusLabel(member)}
        </span>
      )}
    </div>
  );
}

// Helper to get a friendly status label
function getStatusLabel(member: TripMember): string {
  // You can customize these based on actual member activity
  const labels = ["Flexible dates", "Watching prices", "Ready to book", "Checking calendar"];
  // Use member ID to consistently assign a label
  return labels[member.id % labels.length];
}
