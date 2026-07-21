// src/components/BudgetTab.tsx
import React, { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api";

// ============================================
// TYPES
// ============================================

interface BudgetCategory {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentUsed: number;
  currency: string;
  categories: BudgetCategory[];
}

interface BudgetTabProps {
  tripId: string;
}

// ============================================
// CONSTANTS
// ============================================

const CATEGORIES = [
  { key: "flights", label: "Flights" },
  { key: "hotels", label: "Hotels" },
  { key: "transport", label: "Transport" },
  { key: "food", label: "Food" },
  { key: "activities", label: "Activities" },
  { key: "other", label: "Other" },
];

const getCategoryInfo = (key: string) =>
  CATEGORIES.find((c) => c.key === key) || { key, label: key };

// ============================================
// COMPONENT
// ============================================

export function BudgetTab({ tripId }: BudgetTabProps) {
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchBudget = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api<BudgetSummary>(`/trips/${tripId}/budget`);
      setBudget(data);
    } catch (err) {
      console.error("Failed to fetch budget", err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSaveBudget = async () => {
    setSaving(true);
    try {
      const categories = CATEGORIES.map((c) => ({
        category: c.key,
        amount: parseFloat(budgetInputs[c.key] || "0"),
      })).filter((c) => c.amount > 0);

      await api(`/trips/${tripId}/budget`, {
        method: "PUT",
        body: JSON.stringify({ categories, currency: "USD" }),
      });

      await fetchBudget();
      setShowBudgetModal(false);
    } catch (err) {
      console.error("Failed to save budget", err);
      alert("Failed to save budget");
    } finally {
      setSaving(false);
    }
  };

  const openBudgetModal = () => {
    const inputs: Record<string, string> = {};
    if (budget) {
      budget.categories.forEach((c) => {
        inputs[c.category] = c.budgeted.toString();
      });
    }
    setBudgetInputs(inputs);
    setShowBudgetModal(true);
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass-card rounded-2xl p-6 animate-pulse">
          <div className="h-6 bg-[var(--card-border)] rounded w-1/3 mb-4" />
          <div className="h-32 bg-[var(--card-border)] rounded" />
        </div>
      </div>
    );
  }

  const hasBudget = budget && budget.totalBudget > 0;

  return (
    <div className="space-y-6">
      {/* Budget Overview Card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="icon-badge icon-badge-emerald text-xl">📊</div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Trip Budget</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Plan your spending by category
              </p>
            </div>
          </div>
          <button onClick={openBudgetModal} className="btn-secondary text-sm">
            {hasBudget ? "Edit Budget" : "Set Budget"}
          </button>
        </div>

        {hasBudget ? (
          <>
            {/* Overall Progress */}
            <div className="mb-8 p-4 rounded-2xl bg-[var(--card)]">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Total Budget</p>
                  <p className="text-3xl font-bold text-[var(--text)]">
                    ${budget.totalBudget.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--text-muted)]">Spent</p>
                  <p className="text-xl font-semibold text-[var(--accent)]">
                    ${budget.totalSpent.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="h-4 bg-[var(--card-border)] rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    budget.percentUsed > 100
                      ? "bg-red-500"
                      : budget.percentUsed > 80
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
                />
              </div>
              
              <div className="flex justify-between text-sm">
                <span
                  className={`font-medium ${
                    budget.percentUsed > 100
                      ? "text-red-500"
                      : budget.percentUsed > 80
                      ? "text-amber-500"
                      : "text-emerald-500"
                  }`}
                >
                  {budget.percentUsed}% used
                </span>
                <span className="text-[var(--text-muted)]">
                  ${budget.remaining.toLocaleString()} remaining
                </span>
              </div>
            </div>

            {/* Category Breakdown */}
            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">
              By Category
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budget.categories.map((cat) => {
                const info = getCategoryInfo(cat.category);
                const isOverBudget = cat.percentUsed > 100;
                const isNearLimit = cat.percentUsed > 80;
                
                return (
                  <div
                    key={cat.category}
                    className="p-4 rounded-xl bg-[var(--card)] border border-[var(--card-border)]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-[var(--text)]">
                        {info.label}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isOverBudget
                            ? "text-red-500"
                            : isNearLimit
                            ? "text-amber-500"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {cat.percentUsed}%
                      </span>
                    </div>
                    
                    <div className="h-2 bg-[var(--card-border)] rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full ${
                          isOverBudget
                            ? "bg-red-500"
                            : isNearLimit
                            ? "bg-amber-400"
                            : "bg-[var(--accent)]"
                        }`}
                        style={{ width: `${Math.min(cat.percentUsed, 100)}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-xs text-[var(--text-muted)]">
                      <span>${cat.spent.toLocaleString()} spent</span>
                      <span>${cat.budgeted.toLocaleString()} budgeted</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
              No budget set yet
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md mx-auto">
              Set a budget for your trip to track spending by category and stay on track.
            </p>
            <button onClick={openBudgetModal} className="btn-accent">
              Set Budget
            </button>
          </div>
        )}
      </div>

      {/* Tips Card */}
      {hasBudget && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-[var(--text)] mb-3">💡 Budget Tips</h3>
          <ul className="space-y-2 text-sm text-[var(--text-muted)]">
            <li>• Track expenses in the <strong>Split Costs</strong> section (left sidebar)</li>
            <li>• Categories over 80% are highlighted in amber</li>
            <li>• Categories over 100% are highlighted in red</li>
          </ul>
        </div>
      )}

      {/* ============================================ */}
      {/* SET BUDGET MODAL */}
      {/* ============================================ */}
      {showBudgetModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowBudgetModal(false)}
        >
          <div
            className="glass-card w-full max-w-md p-6 rounded-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--text)]">Set Budget</h2>
              <button
                onClick={() => setShowBudgetModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-[var(--text-muted)] mb-6">
              Set spending limits for each category. Leave blank for categories you don't want to track.
            </p>

            <div className="space-y-4">
              {CATEGORIES.map((cat) => (
                <div key={cat.key}>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">
                    {cat.label}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={budgetInputs[cat.key] || ""}
                      onChange={(e) =>
                        setBudgetInputs({ ...budgetInputs, [cat.key]: e.target.value })
                      }
                      placeholder="0"
                      className="trips-input w-full"
                      style={{ paddingLeft: '28px' }}
                    />
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-[var(--border)]">
                <div className="flex justify-between text-sm font-medium text-[var(--text)]">
                  <span>Total Budget:</span>
                  <span className="text-lg">
                    $
                    {Object.values(budgetInputs)
                      .reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSaveBudget}
                disabled={saving}
                className="btn-accent w-full mt-4"
              >
                {saving ? "Saving..." : "Save Budget"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
