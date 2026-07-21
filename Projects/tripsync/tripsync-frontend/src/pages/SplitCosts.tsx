// src/pages/SplitCosts.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../utils/api";

// ============================================
// TYPES
// ============================================

type Theme = "light" | "dark";

interface Expense {
  id: number;
  title: string;
  description: string | null;
  category: string;
  amount: number;
  currency: string;
  expenseDate: string | null;
  paidByName: string;
  paidById: number;
  splitType: string;
  settled: boolean;
  splits: Split[];
  canEdit: boolean;
  createdAt: string;
}

interface Split {
  memberId: number;
  memberName: string;
  amount: number;
  paid: boolean;
}

interface MemberBalance {
  memberId: number;
  memberName: string;
  totalPaid: number;
  totalOwes: number;
  netBalance: number;
}

interface Settlement {
  fromMemberId: number;
  fromMemberName: string;
  toMemberId: number;
  toMemberName: string;
  amount: number;
}

interface BalanceSummary {
  balances: MemberBalance[];
  settlements: Settlement[];
}

interface TripMember {
  id: number;
  displayName: string;
  homeAirport: string | null;
  guest: boolean;
  creator: boolean;
  isCurrentUser: boolean;
}

interface Trip {
  id: number;
  name: string;
  destination: string;
}

interface MiniGroup {
  id: string;
  name: string;
  memberIds: number[];
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
  { key: "shopping", label: "Shopping" },
  { key: "other", label: "Other" },
];

const getCategoryInfo = (key: string) =>
  CATEGORIES.find((c) => c.key === key) || { key, label: key };

// ============================================
// COMPONENT
// ============================================

export default function SplitCosts() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  // Theme state - load from localStorage
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("tripsync-theme");
    return (saved === "dark" || saved === "light") ? saved : "light";
  });

  // Data state
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<BalanceSummary | null>(null);
  const [miniGroups, setMiniGroups] = useState<MiniGroup[]>([]);

  // UI state
  const [activeView, setActiveView] = useState<"expenses" | "balances" | "groups">("expenses");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  
  // New expense form
  const [newExpense, setNewExpense] = useState({
    title: "",
    description: "",
    category: "other",
    amount: "",
    expenseDate: "",
    splitType: "FULL_GROUP" as "FULL_GROUP" | "MINI_GROUP" | "INDIVIDUAL",
    selectedMemberIds: [] as number[],
    selectedGroupId: "",
    paidById: 0,
  });

  // New mini group form
  const [newGroup, setNewGroup] = useState({
    name: "",
    memberIds: [] as number[],
  });

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Current user
  const currentUser = members.find((m) => m.isCurrentUser);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchTrip = useCallback(async () => {
    if (!tripId) return;
    try {
      const data = await api<Trip>(`/trips/${tripId}`);
      setTrip(data);
    } catch (err) {
      console.error("Failed to fetch trip", err);
    }
  }, [tripId]);

  const fetchMembers = useCallback(async () => {
    if (!tripId) return;
    try {
      const data = await api<TripMember[]>(`/trips/${tripId}/members`);
      setMembers(data);
    } catch (err) {
      console.error("Failed to fetch members", err);
    }
  }, [tripId]);

  const fetchExpenses = useCallback(async () => {
    if (!tripId) return;
    try {
      const data = await api<Expense[]>(`/trips/${tripId}/expenses`);
      setExpenses(data);
    } catch (err) {
      console.error("Failed to fetch expenses", err);
    }
  }, [tripId]);

  const fetchBalances = useCallback(async () => {
    if (!tripId) return;
    try {
      const data = await api<BalanceSummary>(`/trips/${tripId}/balances`);
      setBalances(data);
    } catch (err) {
      console.error("Failed to fetch balances", err);
    }
  }, [tripId]);

  // Load mini groups from localStorage
  const loadMiniGroups = useCallback(() => {
    const stored = localStorage.getItem(`miniGroups_${tripId}`);
    if (stored) {
      setMiniGroups(JSON.parse(stored));
    }
  }, [tripId]);

  // Save mini groups to localStorage
  const saveMiniGroups = (groups: MiniGroup[]) => {
    localStorage.setItem(`miniGroups_${tripId}`, JSON.stringify(groups));
    setMiniGroups(groups);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTrip(), fetchMembers(), fetchExpenses(), fetchBalances()]);
    loadMiniGroups();
    setLoading(false);
  }, [fetchTrip, fetchMembers, fetchExpenses, fetchBalances, loadMiniGroups]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Apply theme and save to localStorage
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    localStorage.setItem("tripsync-theme", theme);
  }, [theme]);

  // Set default paidById when members load
  useEffect(() => {
    if (currentUser && newExpense.paidById === 0) {
      setNewExpense((prev) => ({ ...prev, paidById: currentUser.id }));
    }
  }, [currentUser]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;

    setSaving(true);
    try {
      // Determine which members to split with
      let splitMemberIds: number[] = [];
      let splitType = "EQUAL";

      if (newExpense.splitType === "FULL_GROUP") {
        splitMemberIds = members.map((m) => m.id);
      } else if (newExpense.splitType === "MINI_GROUP") {
        if (newExpense.selectedGroupId) {
          const group = miniGroups.find((g) => g.id === newExpense.selectedGroupId);
          splitMemberIds = group?.memberIds || [];
        } else {
          splitMemberIds = newExpense.selectedMemberIds;
        }
      } else {
        // Individual - no split
        splitType = "NONE";
      }

      // Calculate custom splits for mini groups
      const amount = parseFloat(newExpense.amount);
      const customSplits = splitMemberIds.length > 0 
        ? splitMemberIds.map((memberId) => ({
            memberId,
            amount: amount / splitMemberIds.length,
          }))
        : undefined;

      await api(`/trips/${tripId}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          title: newExpense.title,
          description: newExpense.description || null,
          category: newExpense.category,
          amount: amount,
          expenseDate: newExpense.expenseDate || null,
          splitType: newExpense.splitType === "INDIVIDUAL" ? "NONE" : "CUSTOM",
          customSplits: customSplits,
        }),
      });

      // Reset form
      setNewExpense({
        title: "",
        description: "",
        category: "other",
        amount: "",
        expenseDate: "",
        splitType: "FULL_GROUP",
        selectedMemberIds: [],
        selectedGroupId: "",
        paidById: currentUser?.id || 0,
      });
      setShowExpenseModal(false);
      await Promise.all([fetchExpenses(), fetchBalances()]);
    } catch (err) {
      console.error("Failed to add expense", err);
      alert("Failed to add expense");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (expenseId: number) => {
    if (!confirm("Delete this expense?")) return;

    try {
      await api(`/trips/${tripId}/expenses/${expenseId}`, { method: "DELETE" });
      await Promise.all([fetchExpenses(), fetchBalances()]);
    } catch (err) {
      console.error("Failed to delete expense", err);
      alert("Failed to delete expense");
    }
  };

  const handleCreateMiniGroup = () => {
    if (!newGroup.name || newGroup.memberIds.length < 2) {
      alert("Please enter a group name and select at least 2 members");
      return;
    }

    const group: MiniGroup = {
      id: Date.now().toString(),
      name: newGroup.name,
      memberIds: newGroup.memberIds,
    };

    saveMiniGroups([...miniGroups, group]);
    setNewGroup({ name: "", memberIds: [] });
    setShowGroupModal(false);
  };

  const handleDeleteMiniGroup = (groupId: string) => {
    if (!confirm("Delete this group?")) return;
    saveMiniGroups(miniGroups.filter((g) => g.id !== groupId));
  };

  const toggleMemberSelection = (memberId: number) => {
    setNewExpense((prev) => ({
      ...prev,
      selectedMemberIds: prev.selectedMemberIds.includes(memberId)
        ? prev.selectedMemberIds.filter((id) => id !== memberId)
        : [...prev.selectedMemberIds, memberId],
    }));
  };

  const toggleGroupMemberSelection = (memberId: number) => {
    setNewGroup((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(memberId)
        ? prev.memberIds.filter((id) => id !== memberId)
        : [...prev.memberIds, memberId],
    }));
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen page-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">Loading expenses…</p>
        </div>
      </div>
    );
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen flex page-gradient text-[var(--text)]">
      {/* ============================================ */}
      {/* SIDEBAR */}
      {/* ============================================ */}
      <aside className="sidebar w-72 flex flex-col shrink-0 border-r border-[var(--border)] bg-white/80 dark:bg-[#1a1a24] backdrop-blur-xl h-screen sticky top-0 overflow-y-auto">
        {/* Logo row */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <div 
            className="sidebar-logo h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-bold cursor-pointer"
            onClick={() => navigate("/trips")}
          >
            TS
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--text)]">TripSync</span>
            <span className="text-xs text-[var(--text-muted)]">Group travel made easy</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="mt-4 flex-1 space-y-2 px-4">
          <button 
            className="sidebar-link w-full flex items-center gap-3 px-4 py-3 rounded-2xl"
            onClick={() => navigate(`/trip/${tripId}`)}
          >
            <span className="text-xl">🗺️</span>
            <span className="text-sm font-medium">Trip Board</span>
          </button>

          <button 
            className="sidebar-link"
            onClick={() => navigate(`/trip/${tripId}/itinerary`)}
          >
            <span className="text-xl">📋</span>
            <span>Itinerary</span>
          </button>

          <button className="sidebar-link" onClick={() => navigate(`/trip/${tripId}/flights`)}>
            <span className="text-xl">✈️</span>
            <span>Flights</span>
          </button>

          <button className="sidebar-link">
            <span className="text-xl">🏨</span>
            <span>Hotels</span>
          </button>

          <button className="sidebar-nav-active w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl">
            <span className="flex items-center gap-3">
              <span className="text-xl">💰</span>
              <span className="text-sm font-medium">Split costs</span>
            </span>
            <span className="active-chip text-[10px] px-2 py-0.5 rounded-full">Active</span>
          </button>
        </nav>

        {/* Bottom account chip */}
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

      {/* ============================================ */}
      {/* MAIN CONTENT */}
      {/* ============================================ */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-[var(--border)] bg-[var(--panel)] backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[var(--text)]">Split Costs</h1>
              <p className="text-xs text-[var(--text-muted)]">{trip?.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="theme-toggle"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? "☀️" : "🌙"} <span>{theme === "dark" ? "Light" : "Dark"}</span>
              </button>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="btn-accent text-sm"
              >
                + Add Expense
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-8 py-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-card rounded-2xl p-5">
                <p className="text-sm text-[var(--text-muted)] mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-[var(--accent)]">
                  ${totalExpenses.toFixed(2)}
                </p>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <p className="text-sm text-[var(--text-muted)] mb-1">Transactions</p>
                <p className="text-2xl font-bold text-[var(--text)]">{expenses.length}</p>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <p className="text-sm text-[var(--text-muted)] mb-1">Trip Squad</p>
                <p className="text-2xl font-bold text-[var(--text)]">{members.length}</p>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <p className="text-sm text-[var(--text-muted)] mb-1">Mini Groups</p>
                <p className="text-2xl font-bold text-[var(--text)]">{miniGroups.length}</p>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveView("expenses")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeView === "expenses"
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--accent-light)]"
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setActiveView("balances")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeView === "balances"
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--accent-light)]"
                }`}
              >
                Balances
              </button>
              <button
                onClick={() => setActiveView("groups")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeView === "groups"
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--accent-light)]"
                }`}
              >
                Mini Groups
              </button>
            </div>

            {/* ============================================ */}
            {/* EXPENSES VIEW */}
            {/* ============================================ */}
            {activeView === "expenses" && (
              <div className="space-y-3">
                {expenses.length === 0 ? (
                  <div className="glass-card rounded-2xl p-8 text-center">
                    <p className="text-[var(--text-muted)] mb-4">No expenses yet</p>
                    <button
                      onClick={() => setShowExpenseModal(true)}
                      className="btn-accent text-sm"
                    >
                      Add your first expense
                    </button>
                  </div>
                ) : (
                  expenses.map((expense) => {
                    const catInfo = getCategoryInfo(expense.category);
                    const splitCount = expense.splits?.length || 0;
                    return (
                      <div
                        key={expense.id}
                        className="glass-card rounded-2xl p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[var(--accent-light)] flex items-center justify-center">
                            <span className="text-xs font-semibold text-[var(--accent)] uppercase">
                              {catInfo.label.slice(0, 3)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-[var(--text)] truncate">
                                {expense.title}
                              </h4>
                              {expense.settled && (
                                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-2 py-0.5 rounded-full">
                                  Settled
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-muted)]">
                              Paid by {expense.paidByName}
                              {expense.expenseDate && ` • ${expense.expenseDate}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {splitCount > 0 ? (
                                <span className="text-xs bg-[var(--accent-light)] text-[var(--accent)] px-2 py-0.5 rounded-full">
                                  Split {splitCount} ways
                                </span>
                              ) : (
                                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                                  Individual
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[var(--text)] text-lg">
                              ${expense.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">{catInfo.label}</p>
                          </div>
                          {expense.canEdit && (
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-2 text-[var(--text-muted)] hover:text-red-500"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        
                        {/* Show split details */}
                        {expense.splits && expense.splits.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[var(--border)]">
                            <div className="flex flex-wrap gap-2">
                              {expense.splits.map((split) => (
                                <div
                                  key={split.memberId}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
                                    split.paid
                                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                                      : "bg-[var(--card)] text-[var(--text-muted)]"
                                  }`}
                                >
                                  <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-[10px]">
                                    {split.memberName.charAt(0)}
                                  </span>
                                  <span>{split.memberName}</span>
                                  <span className="font-medium">${split.amount.toFixed(2)}</span>
                                  {split.paid && <span>✓</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ============================================ */}
            {/* BALANCES VIEW */}
            {/* ============================================ */}
            {activeView === "balances" && balances && (
              <div className="space-y-4">
                {/* Who Owes Who */}
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-[var(--text)] mb-4">Who Owes Who</h3>

                  {balances.balances.length === 0 || expenses.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-[var(--text-muted)]">
                        Add some expenses to see balances
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {balances.balances.map((b) => (
                        <div
                          key={b.memberId}
                          className="flex items-center justify-between p-3 rounded-xl bg-[var(--card)]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-medium">
                              {b.memberName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--text)]">{b.memberName}</p>
                              <p className="text-xs text-[var(--text-muted)]">
                                Paid ${b.totalPaid.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`text-right ${
                              b.netBalance > 0.01
                                ? "text-emerald-500"
                                : b.netBalance < -0.01
                                ? "text-red-500"
                                : "text-[var(--text-muted)]"
                            }`}
                          >
                            <p className="font-bold text-lg">
                              {b.netBalance > 0 ? "+" : ""}
                              ${b.netBalance.toFixed(2)}
                            </p>
                            <p className="text-xs">
                              {b.netBalance > 0.01
                                ? "gets back"
                                : b.netBalance < -0.01
                                ? "owes"
                                : "settled up"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Settlement Suggestions */}
                {balances.settlements.length > 0 && (
                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-[var(--text)] mb-2">
                      💡 Settle Up
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mb-4">
                      Suggested payments to settle all debts
                    </p>
                    <div className="space-y-3">
                      {balances.settlements.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center font-medium">
                              {s.fromMemberName.charAt(0)}
                            </div>
                            <div className="text-center">
                              <span className="text-[var(--text-muted)] text-lg">→</span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center font-medium">
                              {s.toMemberName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[var(--text)]">
                                {s.fromMemberName} pays {s.toMemberName}
                              </p>
                            </div>
                          </div>
                          <span className="font-bold text-amber-600 dark:text-amber-400 text-xl">
                            ${s.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================ */}
            {/* MINI GROUPS VIEW */}
            {/* ============================================ */}
            {activeView === "groups" && (
              <div className="space-y-4">
                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text)]">Mini Groups</h3>
                      <p className="text-sm text-[var(--text-muted)]">
                        Create subgroups for splitting specific expenses
                      </p>
                    </div>
                    <button
                      onClick={() => setShowGroupModal(true)}
                      className="btn-secondary text-sm"
                    >
                      + New Group
                    </button>
                  </div>

                  {/* Full Group (always present) */}
                  <div className="mb-4 p-4 rounded-xl bg-[var(--accent-light)] border-2 border-[var(--accent)]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-[var(--text)]">Full Trip Squad</h4>
                      <span className="text-xs bg-[var(--accent)] text-white px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/50 dark:bg-black/20 text-sm"
                        >
                          <span className="w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs">
                            {m.displayName.charAt(0)}
                          </span>
                          <span className="text-[var(--text)]">{m.displayName}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mini Groups */}
                  {miniGroups.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-[var(--border)] rounded-xl">
                      <p className="text-sm text-[var(--text-muted)] mb-3">
                        No mini groups yet
                      </p>
                      <p className="text-xs text-[var(--text-light)] mb-4">
                        Create groups like "Roommates", "Dinner crew", etc.
                      </p>
                      <button
                        onClick={() => setShowGroupModal(true)}
                        className="btn-accent text-sm"
                      >
                        Create Mini Group
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {miniGroups.map((group) => (
                        <div
                          key={group.id}
                          className="p-4 rounded-xl bg-[var(--card)] border border-[var(--card-border)]"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-[var(--text)]">{group.name}</h4>
                            <button
                              onClick={() => handleDeleteMiniGroup(group.id)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {group.memberIds.map((memberId) => {
                              const member = members.find((m) => m.id === memberId);
                              return member ? (
                                <div
                                  key={memberId}
                                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--card-border)] text-sm"
                                >
                                  <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-[10px]">
                                    {member.displayName.charAt(0)}
                                  </span>
                                  <span className="text-[var(--text-muted)]">
                                    {member.displayName}
                                  </span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* ADD EXPENSE MODAL */}
      {/* ============================================ */}
      {showExpenseModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowExpenseModal(false)}
        >
          <div
            className="glass-card w-full max-w-lg p-6 rounded-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--text)]">Add Expense</h2>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  What's this for? *
                </label>
                <input
                  type="text"
                  value={newExpense.title}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, title: e.target.value })
                  }
                  placeholder="e.g., Airbnb, Rental car, Dinner"
                  className="trips-input w-full"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, amount: e.target.value })
                    }
                    placeholder="0.00"
                    className="trips-input w-full"
                    style={{ paddingLeft: '28px' }}
                    required
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() =>
                        setNewExpense({ ...newExpense, category: cat.key })
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        newExpense.category === cat.key
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--card-border)] text-[var(--text-muted)] hover:bg-[var(--accent-light)]"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  Date (optional)
                </label>
                <input
                  type="date"
                  value={newExpense.expenseDate}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, expenseDate: e.target.value })
                  }
                  className="trips-input w-full"
                />
              </div>

              {/* Split Type */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Split between
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setNewExpense({ ...newExpense, splitType: "FULL_GROUP", selectedMemberIds: [], selectedGroupId: "" })
                    }
                    className={`p-3 rounded-xl text-center text-sm font-medium transition-all ${
                      newExpense.splitType === "FULL_GROUP"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--card-border)] text-[var(--text-muted)]"
                    }`}
                  >
                    Full Group
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewExpense({ ...newExpense, splitType: "MINI_GROUP" })
                    }
                    className={`p-3 rounded-xl text-center text-sm font-medium transition-all ${
                      newExpense.splitType === "MINI_GROUP"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--card-border)] text-[var(--text-muted)]"
                    }`}
                  >
                    Mini Group
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewExpense({ ...newExpense, splitType: "INDIVIDUAL", selectedMemberIds: [], selectedGroupId: "" })
                    }
                    className={`p-3 rounded-xl text-center text-sm font-medium transition-all ${
                      newExpense.splitType === "INDIVIDUAL"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--card-border)] text-[var(--text-muted)]"
                    }`}
                  >
                    Individual
                  </button>
                </div>
              </div>

              {/* Mini Group Selection */}
              {newExpense.splitType === "MINI_GROUP" && (
                <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--card-border)]">
                  {/* Saved Groups */}
                  {miniGroups.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-2">
                        Use saved group
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {miniGroups.map((group) => (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() =>
                              setNewExpense({
                                ...newExpense,
                                selectedGroupId: group.id,
                                selectedMemberIds: [],
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                              newExpense.selectedGroupId === group.id
                                ? "bg-[var(--accent)] text-white"
                                : "bg-[var(--card-border)] text-[var(--text-muted)]"
                            }`}
                          >
                            {group.name} ({group.memberIds.length})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Or pick individual members */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-2">
                      {miniGroups.length > 0 ? "Or select members" : "Select members"}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {members.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            toggleMemberSelection(m.id);
                            setNewExpense((prev) => ({ ...prev, selectedGroupId: "" }));
                          }}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-all ${
                            newExpense.selectedMemberIds.includes(m.id)
                              ? "bg-[var(--accent)] text-white"
                              : "bg-[var(--card-border)] text-[var(--text-muted)]"
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                            {m.displayName.charAt(0)}
                          </span>
                          {m.displayName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  {(newExpense.selectedGroupId || newExpense.selectedMemberIds.length > 0) && newExpense.amount && (
                    <div className="mt-4 pt-4 border-t border-[var(--border)]">
                      <p className="text-xs text-[var(--text-muted)]">
                        Each person pays:{" "}
                        <span className="font-bold text-[var(--text)]">
                          $
                          {(
                            parseFloat(newExpense.amount) /
                            (newExpense.selectedGroupId
                              ? miniGroups.find((g) => g.id === newExpense.selectedGroupId)?.memberIds.length || 1
                              : newExpense.selectedMemberIds.length || 1)
                          ).toFixed(2)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Full Group Preview */}
              {newExpense.splitType === "FULL_GROUP" && newExpense.amount && (
                <div className="p-3 rounded-xl bg-[var(--accent-light)]">
                  <p className="text-sm text-[var(--text)]">
                    Split equally among {members.length} people:{" "}
                    <span className="font-bold">
                      ${(parseFloat(newExpense.amount) / members.length).toFixed(2)} each
                    </span>
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !newExpense.title || !newExpense.amount}
                className="btn-accent w-full mt-4"
              >
                {saving ? "Adding..." : "Add Expense"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* CREATE MINI GROUP MODAL */}
      {/* ============================================ */}
      {showGroupModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowGroupModal(false)}
        >
          <div
            className="glass-card w-full max-w-md p-6 rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--text)]">Create Mini Group</h2>
              <button
                onClick={() => setShowGroupModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="e.g., Roommates, Dinner crew"
                  className="trips-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Select Members *
                </label>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleGroupMemberSelection(m.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${
                        newGroup.memberIds.includes(m.id)
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--card-border)] text-[var(--text-muted)]"
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                        {m.displayName.charAt(0)}
                      </span>
                      {m.displayName}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {newGroup.memberIds.length} selected (minimum 2)
                </p>
              </div>

              <button
                onClick={handleCreateMiniGroup}
                disabled={!newGroup.name || newGroup.memberIds.length < 2}
                className="btn-accent w-full mt-4"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
