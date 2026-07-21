// src/components/IdeasBoard.tsx
import React, { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api";

// ============================================
// TYPES
// ============================================

interface Idea {
  id: number;
  title: string;
  description: string | null;
  category: string;
  link: string | null;
  addedByName: string;
  addedById: number;
  voteCount: number;
  userVoted: boolean;
  voters: string[];
  createdAt: string;
}

interface TripMember {
  id: number;
  displayName: string;
  isCurrentUser: boolean;
}

interface IdeasBoardProps {
  tripId: string;
  members: TripMember[];
}

// ============================================
// CONSTANTS
// ============================================

const CATEGORIES = [
  { key: "food", label: "Food & Dining", emoji: "🍽️" },
  { key: "activities", label: "Activities", emoji: "🎯" },
  { key: "sightseeing", label: "Sightseeing", emoji: "📸" },
  { key: "nightlife", label: "Nightlife", emoji: "🌙" },
  { key: "shopping", label: "Shopping", emoji: "🛍️" },
  { key: "relaxation", label: "Relaxation", emoji: "🧘" },
  { key: "adventure", label: "Adventure", emoji: "🏔️" },
  { key: "other", label: "Other", emoji: "✨" },
];

const getCategoryInfo = (key: string) =>
  CATEGORIES.find((c) => c.key === key) || { key, label: key, emoji: "✨" };

// ============================================
// COMPONENT
// ============================================

export function IdeasBoard({ tripId, members }: IdeasBoardProps) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"votes" | "recent">("votes");

  // New idea form
  const [newIdea, setNewIdea] = useState({
    title: "",
    description: "",
    category: "activities",
    link: "",
  });
  const [saving, setSaving] = useState(false);

  // Current user
  const currentUser = members.find((m) => m.isCurrentUser);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchIdeas = useCallback(async () => {
    try {
      const data = await api<Idea[]>(`/trips/${tripId}/ideas`);
      setIdeas(data);
    } catch (err) {
      console.error("Failed to fetch ideas", err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdea.title) return;

    setSaving(true);
    try {
      await api(`/trips/${tripId}/ideas`, {
        method: "POST",
        body: JSON.stringify({
          title: newIdea.title,
          description: newIdea.description || null,
          category: newIdea.category,
          link: newIdea.link || null,
        }),
      });

      setNewIdea({ title: "", description: "", category: "activities", link: "" });
      setShowAddModal(false);
      await fetchIdeas();
    } catch (err) {
      console.error("Failed to add idea", err);
      alert("Failed to add idea");
    } finally {
      setSaving(false);
    }
  };

  const handleVote = async (ideaId: number) => {
    try {
      await api(`/trips/${tripId}/ideas/${ideaId}/vote`, { method: "POST" });
      await fetchIdeas();
    } catch (err) {
      console.error("Failed to vote", err);
    }
  };

  const handleUnvote = async (ideaId: number) => {
    try {
      await api(`/trips/${tripId}/ideas/${ideaId}/vote`, { method: "DELETE" });
      await fetchIdeas();
    } catch (err) {
      console.error("Failed to unvote", err);
    }
  };

  const handleDeleteIdea = async (ideaId: number) => {
    if (!confirm("Delete this idea?")) return;

    try {
      await api(`/trips/${tripId}/ideas/${ideaId}`, { method: "DELETE" });
      await fetchIdeas();
    } catch (err) {
      console.error("Failed to delete idea", err);
      alert("Failed to delete idea");
    }
  };

  // ============================================
  // FILTERING & SORTING
  // ============================================

  const filteredIdeas = ideas
    .filter((idea) => !filterCategory || idea.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === "votes") {
        return b.voteCount - a.voteCount;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Group by category for display
  const ideasByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = filteredIdeas.filter((i) => i.category === cat.key);
    return acc;
  }, {} as Record<string, Idea[]>);

  const categoriesWithIdeas = CATEGORIES.filter(
    (cat) => ideasByCategory[cat.key]?.length > 0
  );

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
            <div className="h-6 bg-[var(--card-border)] rounded w-1/3 mb-3" />
            <div className="h-4 bg-[var(--card-border)] rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text)]">Ideas Board</h2>
            <p className="text-sm text-[var(--text-muted)]">
              {ideas.length === 0 
                ? "Suggest and vote on activities for your trip"
                : `${ideas.length} idea${ideas.length !== 1 ? 's' : ''} · ${ideas.reduce((sum, i) => sum + i.voteCount, 0)} votes`
              }
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-accent text-sm">
            + Add Idea
          </button>
        </div>
      </div>

      {/* Filters & Sort - only show when there are ideas */}
      {ideas.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                filterCategory === null
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--accent-light)]"
              }`}
            >
              All
            </button>
            {CATEGORIES.filter(cat => ideasByCategory[cat.key]?.length > 0).map((cat) => (
              <button
                key={cat.key}
                onClick={() => setFilterCategory(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  filterCategory === cat.key
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--accent-light)]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Sort:</span>
            <button
              onClick={() => setSortBy("votes")}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                sortBy === "votes"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--card)] text-[var(--text-muted)]"
              }`}
            >
              Top Voted
            </button>
            <button
              onClick={() => setSortBy("recent")}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                sortBy === "recent"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--card)] text-[var(--text-muted)]"
              }`}
            >
              Recent
            </button>
          </div>
        </div>
      )}

      {/* Ideas List */}
      {ideas.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
            No ideas yet
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md mx-auto">
            Add restaurants, activities, sightseeing spots, or anything you'd like to do on this trip.
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn-accent">
            Add First Idea
          </button>
        </div>
      ) : filterCategory ? (
        // Flat list when filtering
        <div className="space-y-3">
          {filteredIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              currentUserId={currentUser?.id}
              onVote={() => handleVote(idea.id)}
              onUnvote={() => handleUnvote(idea.id)}
              onDelete={() => handleDeleteIdea(idea.id)}
            />
          ))}
        </div>
      ) : (
        // Grouped by category when not filtering
        <div className="space-y-6">
          {categoriesWithIdeas.map((cat) => (
            <div key={cat.key}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-[var(--text)]">{cat.label}</h3>
                <span className="text-xs text-[var(--text-muted)]">
                  ({ideasByCategory[cat.key].length})
                </span>
              </div>
              <div className="space-y-3">
                {ideasByCategory[cat.key].map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    currentUserId={currentUser?.id}
                    onVote={() => handleVote(idea.id)}
                    onUnvote={() => handleUnvote(idea.id)}
                    onDelete={() => handleDeleteIdea(idea.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================ */}
      {/* ADD IDEA MODAL */}
      {/* ============================================ */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="glass-card w-full max-w-md p-6 rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--text)]">Add Idea</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddIdea} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  What's your idea? *
                </label>
                <input
                  type="text"
                  value={newIdea.title}
                  onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                  placeholder="e.g., Visit the Louvre Museum"
                  className="trips-input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newIdea.description}
                  onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                  placeholder="Add more details about this idea..."
                  className="trips-input w-full min-h-[80px] resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setNewIdea({ ...newIdea, category: cat.key })}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        newIdea.category === cat.key
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--card-border)] text-[var(--text-muted)] hover:bg-[var(--accent-light)]"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  Link (optional)
                </label>
                <input
                  type="url"
                  value={newIdea.link}
                  onChange={(e) => setNewIdea({ ...newIdea, link: e.target.value })}
                  placeholder="https://..."
                  className="trips-input w-full"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Add a link to Google Maps, Yelp, or the venue's website
                </p>
              </div>

              <button
                type="submit"
                disabled={saving || !newIdea.title}
                className="btn-accent w-full mt-4"
              >
                {saving ? "Adding..." : "Add Idea"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// IDEA CARD COMPONENT
// ============================================

function IdeaCard({
  idea,
  currentUserId,
  onVote,
  onUnvote,
  onDelete,
}: {
  idea: Idea;
  currentUserId?: number;
  onVote: () => void;
  onUnvote: () => void;
  onDelete: () => void;
}) {
  const catInfo = getCategoryInfo(idea.category);
  const canDelete = idea.addedById === currentUserId;

  return (
    <div className="glass-card rounded-2xl p-4 flex gap-4">
      {/* Vote Button */}
      <div className="flex flex-col items-center">
        <button
          onClick={idea.userVoted ? onUnvote : onVote}
          className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all ${
            idea.userVoted
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]"
          }`}
        >
          <span className="text-lg">▲</span>
          <span className="text-sm font-bold">{idea.voteCount}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-[var(--text)]">{idea.title}</h4>
          {canDelete && (
            <button
              onClick={onDelete}
              className="text-[var(--text-muted)] hover:text-red-500 text-sm"
            >
              ✕
            </button>
          )}
        </div>
        
        {idea.description && (
          <p className="text-sm text-[var(--text-muted)] mt-1">{idea.description}</p>
        )}
        
        {idea.link && (
          <a
            href={idea.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline text-sm mt-1 inline-block"
          >
            View link →
          </a>
        )}
        
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent)]">
            {catInfo.label}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            by {idea.addedByName}
          </span>
        </div>

        {/* Voters */}
        {idea.voters.length > 0 && (
          <div className="flex items-center gap-1 mt-3">
            <div className="flex -space-x-2">
              {idea.voters.slice(0, 5).map((name, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-[10px] font-medium border-2 border-[var(--panel)]"
                  title={name}
                >
                  {name.charAt(0)}
                </div>
              ))}
            </div>
            {idea.voters.length > 5 && (
              <span className="text-xs text-[var(--text-muted)]">
                +{idea.voters.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
