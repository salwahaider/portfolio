// src/components/DestinationVoting.tsx
import React, { useState, useEffect, useCallback } from "react";
import { api, guestApi } from "../utils/api";

interface Destination {
  id: number;
  name: string;
  label: string | null;
  emoji: string | null;
  priceTag: string | null;
  votes: number;
  voters: string[];
  hasVoted: boolean;
  addedBy: string;
  canDelete: boolean;
}

interface DestinationVotingProps {
  tripId: string;
}

export function DestinationVoting({ tripId }: DestinationVotingProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add destination modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newEmoji, setNewEmoji] = useState("📍");
  const [newPriceTag, setNewPriceTag] = useState("");
  const [adding, setAdding] = useState(false);

  // Guest detection
  const token = localStorage.getItem("authToken");
  const isGuest = !token;
  const guestMemberId = isGuest ? localStorage.getItem(`guestMemberForTrip_${tripId}`) : null;

  const buildUrl = (base: string) =>
    isGuest && guestMemberId ? `${base}?guestMemberId=${guestMemberId}` : base;

  const callApi = <T,>(url: string, options?: RequestInit) =>
    isGuest ? guestApi<T>(url, options) : api<T>(url, options);

  // Fetch destinations
  const fetchDestinations = useCallback(async () => {
    try {
      setLoading(true);
      const url = buildUrl(`/trips/${tripId}/destinations`);
      const data = await callApi<Destination[]>(url);
      const sorted = [...data].sort((a, b) => b.votes - a.votes);
      setDestinations(sorted);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch destinations", err);
      setError(err.message || "Failed to load destinations");
    } finally {
      setLoading(false);
    }
  }, [tripId, isGuest, guestMemberId]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  // Toggle vote
  const handleVote = async (destinationId: number) => {
    try {
      const url = buildUrl(`/trips/${tripId}/destinations/${destinationId}/vote`);
      await callApi(url, { method: "POST" });
      await fetchDestinations();
    } catch (err: any) {
      console.error("Failed to vote", err);
      alert(err.message || "Failed to vote");
    }
  };

  // Add destination
  const handleAddDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setAdding(true);
      const url = buildUrl(`/trips/${tripId}/destinations`);
      await callApi(url, {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          label: newLabel.trim() || null,
          emoji: newEmoji || "📍",
          priceTag: newPriceTag || null,
        }),
      });

      setNewName("");
      setNewLabel("");
      setNewEmoji("📍");
      setNewPriceTag("");
      setShowAddModal(false);

      await fetchDestinations();
    } catch (err: any) {
      console.error("Failed to add destination", err);
      alert(err.message || "Failed to add destination");
    } finally {
      setAdding(false);
    }
  };

  // Delete destination
  const handleDelete = async (destinationId: number, name: string) => {
    if (!confirm(`Remove "${name}" from the list?`)) return;

    try {
      await api(`/trips/${tripId}/destinations/${destinationId}`, {
        method: "DELETE",
      });
      await fetchDestinations();
    } catch (err: any) {
      console.error("Failed to delete destination", err);
      alert(err.message || "Failed to delete");
    }
  };

  // Emoji picker options
  const emojiOptions = ["📍", "🏝️", "🏔️", "🌴", "🏖️", "🌊", "🏕️", "🌆", "🎢", "🏰", "⛷️", "🌸"];
  const priceOptions = ["$", "$$", "$$$", "$$$$"];

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="icon-badge icon-badge-violet text-xl">📍</div>
          <h2 className="text-lg font-bold text-[var(--text)]">Destination Voting</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-16 rounded-xl bg-[var(--card-border)]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-3xl p-6">
        <div className="text-center py-4">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={fetchDestinations} className="mt-2 text-sm text-[var(--accent)] hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const topDestination = destinations.length > 0 ? destinations[0] : null;

  return (
    <>
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="icon-badge icon-badge-violet text-xl">📍</div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Destination Voting</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {destinations.length} {destinations.length === 1 ? "option" : "options"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            + Add idea
          </button>
        </div>

        {destinations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🗺️</div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              No destinations yet. Add your first idea!
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-accent text-sm"
            >
              Suggest a destination
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {destinations.map((dest, index) => (
              <div
                key={dest.id}
                className={`relative rounded-2xl p-4 transition-all ${
                  index === 0 && dest.votes > 0
                    ? "bg-[var(--accent-light)] border-2 border-[var(--accent)]"
                    : "bg-[var(--card)] border border-[var(--card-border)]"
                }`}
              >
                {/* Leading badge for top destination */}
                {index === 0 && dest.votes > 0 && (
                  <div className="absolute -top-2 -right-2 bg-[var(--accent)] text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    Leading
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {/* Emoji */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center text-2xl flex-shrink-0">
                    {dest.emoji || "📍"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[var(--text)] truncate">
                        {dest.name}
                      </h3>
                      {dest.priceTag && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {dest.priceTag}
                        </span>
                      )}
                    </div>
                    {dest.label && (
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {dest.label}
                      </p>
                    )}
                    {/* Voters */}
                    {dest.voters.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {dest.voters.slice(0, 5).map((initial, i) => (
                          <div
                            key={i}
                            className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] flex items-center justify-center font-medium"
                          >
                            {initial}
                          </div>
                        ))}
                        {dest.voters.length > 5 && (
                          <span className="text-xs text-[var(--text-muted)]">
                            +{dest.voters.length - 5}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vote button */}
                  <button
                    onClick={() => handleVote(dest.id)}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                      dest.hasVoted
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--card-border)] hover:bg-[var(--accent-light)] text-[var(--text)]"
                    }`}
                  >
                    <span className="text-lg">{dest.hasVoted ? "✓" : "♡"}</span>
                    <span className="text-xs font-semibold">{dest.votes}</span>
                  </button>

                  {/* Delete button (if allowed) */}
                  {dest.canDelete && (
                    <button
                      onClick={() => handleDelete(dest.id, dest.name)}
                      className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                      title="Remove destination"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Destination Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="glass-card w-full max-w-md p-6 rounded-3xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--text)]">Suggest a Destination</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddDestination} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  Destination *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Honolulu, HI"
                  className="trips-input w-full"
                  required
                />
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g., Beach paradise"
                  className="trips-input w-full"
                />
              </div>

              {/* Emoji picker */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewEmoji(emoji)}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                        newEmoji === emoji
                          ? "bg-[var(--accent)] scale-110"
                          : "bg-[var(--card-border)] hover:bg-[var(--accent-light)]"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price tag */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Price range (optional)
                </label>
                <div className="flex gap-2">
                  {priceOptions.map((price) => (
                    <button
                      key={price}
                      type="button"
                      onClick={() => setNewPriceTag(newPriceTag === price ? "" : price)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        newPriceTag === price
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--card-border)] text-[var(--text-muted)] hover:bg-[var(--accent-light)]"
                      }`}
                    >
                      {price}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={adding || !newName.trim()}
                className="btn-accent w-full mt-6"
              >
                {adding ? "Adding..." : "Add Destination"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
