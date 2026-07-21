// src/components/AvailabilityHeatmap.tsx
// VERSION 2.0 - With debug logging
import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../utils/api";

// Log to verify this file is being used
console.log("✅ AvailabilityHeatmap v2.0 loaded");

type DateAvailability = {
  date: string;
  available: string[];
  maybe: string[];
  unavailable: string[];
};

type StatusCode = 0 | 1 | 2 | 3;

const STATUS_NAMES: Record<StatusCode, string> = {
  0: 'Not set',
  1: 'Available', 
  2: 'Maybe',
  3: 'Unavailable'
};

const STATUS_COLORS: Record<StatusCode, string> = {
  0: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-[var(--text)]',
  1: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  2: 'bg-amber-400 hover:bg-amber-500 text-gray-900',
  3: 'bg-red-500 hover:bg-red-600 text-white'
};

type UserAvailability = Record<string, StatusCode>;

interface AvailabilityHeatmapProps {
  tripId: string;
  participants: Array<{
    name: string;
    initial: string;
    isUser: boolean;
  }>;
}

type BackendStatus = "AVAILABLE" | "MAYBE" | "UNAVAILABLE";

function toBackendStatus(code: StatusCode): BackendStatus | null {
  if (code === 1) return 'AVAILABLE';
  if (code === 2) return 'MAYBE';
  if (code === 3) return 'UNAVAILABLE';
  return null;
}

function fromBackendStatus(status: BackendStatus): StatusCode {
  if (status === 'AVAILABLE') return 1;
  if (status === 'MAYBE') return 2;
  if (status === 'UNAVAILABLE') return 3;
  return 0;
}

export function AvailabilityHeatmap({ tripId, participants }: AvailabilityHeatmapProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [userAvailability, setUserAvailability] = useState<UserAvailability>({});
  const [groupAvailability, setGroupAvailability] = useState<Record<string, DateAvailability>>({});
  
  const [showLegend, setShowLegend] = useState(true);
  const [viewMode, setViewMode] = useState<'personal' | 'group'>('personal');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Use a ref object for drag state to avoid closure issues
  const dragRef = useRef({ active: false, mode: 0 as StatusCode });

  useEffect(() => {
    async function fetchMyAvailability() {
      try {
        const data = await api<{ entries: { date: string; status: BackendStatus }[] }>(
          `/trips/${tripId}/availability/me`
        );
        const map: UserAvailability = {};
        for (const entry of data.entries) {
          map[entry.date] = fromBackendStatus(entry.status);
        }
        setUserAvailability(map);
      } catch (err) {
        console.log("No saved availability yet");
      }
    }
    if (tripId) fetchMyAvailability();
  }, [tripId]);

  const fetchGroupAvailability = useCallback(async () => {
    try {
      const data = await api<DateAvailability[]>(`/trips/${tripId}/availability/group`);
      const map: Record<string, DateAvailability> = {};
      data.forEach((d) => { map[d.date] = d; });
      setGroupAvailability(map);
    } catch (err) {
      console.error("Failed to load group availability", err);
    }
  }, [tripId]);

  useEffect(() => {
    if (tripId) fetchGroupAvailability();
  }, [tripId, fetchGroupAvailability]);

  // Calendar helpers
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const formatDate = (year: number, month: number, day: number) => 
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction: number) => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + direction, 1));
  };

  // Cycle to next status: 0 -> 1 -> 2 -> 3 -> 0
  const nextStatus = (current: StatusCode): StatusCode => ((current + 1) % 4) as StatusCode;

  // Set status for a date
  const setStatus = useCallback((date: string, status: StatusCode) => {
    console.log(`Setting ${date} to ${STATUS_NAMES[status]} (${status})`);
    setUserAvailability(prev => {
      const next = { ...prev };
      if (status === 0) {
        delete next[date];
      } else {
        next[date] = status;
      }
      return next;
    });
  }, []);

  // Handle cell interaction - single unified handler
  const handleCellDown = (date: string) => {
    if (viewMode === 'group') return;
    
    const current = userAvailability[date] ?? 0;
    const next = nextStatus(current);
    
    console.log(`Cell ${date}: ${STATUS_NAMES[current]} (${current}) -> ${STATUS_NAMES[next]} (${next})`);
    
    dragRef.current.active = true;
    dragRef.current.mode = next;
    setStatus(date, next);
  };

  const handleCellEnter = (date: string) => {
    if (!dragRef.current.active || viewMode === 'group') return;
    setStatus(date, dragRef.current.mode);
  };

  const handleDragEnd = () => {
    dragRef.current.active = false;
  };

  // Global mouseup/pointerup listener
  useEffect(() => {
    const endDrag = () => { dragRef.current.active = false; };
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('pointerup', endDrag);
    return () => {
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('pointerup', endDrag);
    };
  }, []);

  const clearMonth = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const days = getDaysInMonth(selectedMonth);
    setUserAvailability(prev => {
      const next = { ...prev };
      for (let d = 1; d <= days; d++) {
        delete next[formatDate(year, month, d)];
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const entries = Object.entries(userAvailability)
        .map(([date, code]) => ({ date, status: toBackendStatus(code) }))
        .filter(e => e.status !== null);
      await api(`/trips/${tripId}/availability/me`, {
        method: "PUT",
        body: JSON.stringify({ entries }),
      });
      await fetchGroupAvailability();
      setSaveMessage("Saved! ✓");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      console.error("Error saving", err);
      setSaveMessage("Failed");
    } finally {
      setSaving(false);
    }
  };

  const getGroupColor = (date: string): string => {
    const data = groupAvailability[date];
    if (!data) return STATUS_COLORS[0];
    const pct = (data.available.length / Math.max(participants.length, 1)) * 100;
    if (pct >= 75) return 'bg-emerald-500 text-white';
    if (pct >= 50) return 'bg-emerald-400 text-white';
    if (pct >= 25) return 'bg-amber-400 text-gray-900';
    if (pct > 0) return 'bg-orange-300 text-gray-900';
    return STATUS_COLORS[0];
  };

  const stats = {
    available: Object.values(userAvailability).filter(v => v === 1).length,
    maybe: Object.values(userAvailability).filter(v => v === 2).length,
    unavailable: Object.values(userAvailability).filter(v => v === 3).length,
  };

  const bestDates = Object.entries(groupAvailability)
    .map(([date, data]) => ({
      date,
      score: data.available.length * 2 + data.maybe.length,
      available: data.available.length,
      formatted: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-[var(--text)]">Availability Calendar</h2>
          <div className="flex rounded-xl overflow-hidden border border-[var(--border)]">
            <button
              onClick={() => setViewMode('personal')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'personal'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--accent-light)]'
              }`}
            >
              My Availability
            </button>
            <button
              onClick={() => setViewMode('group')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'group'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--accent-light)]'
              }`}
            >
              Group Heatmap
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {viewMode === 'personal' && (
            <button onClick={clearMonth} className="btn-ghost text-sm">Clear Month</button>
          )}
          <button onClick={() => setShowLegend(!showLegend)} className="btn-ghost text-sm">
            {showLegend ? 'Hide' : 'Show'} Legend
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Calendar */}
        <div 
          className="glass-card p-6"
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigateMonth(-1)} 
              className="w-10 h-10 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--accent-light)]">
              ←
            </button>
            <h3 className="text-lg font-semibold text-[var(--text)]">
              {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
            </h3>
            <button onClick={() => navigateMonth(1)}
              className="w-10 h-10 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--accent-light)]">
              →
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-medium text-[var(--text-muted)] py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid - using onMouseDown NOT onClick */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: getFirstDayOfMonth(selectedMonth) }).map((_, i) => (
              <div key={`empty-${i}`} className="h-11" />
            ))}
            
            {Array.from({ length: getDaysInMonth(selectedMonth) }).map((_, i) => {
              const day = i + 1;
              const date = formatDate(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
              const isToday = date === new Date().toISOString().split('T')[0];
              const status = userAvailability[date] ?? 0;
              const groupData = groupAvailability[date];
              const cellColor = viewMode === 'personal' ? STATUS_COLORS[status] : getGroupColor(date);
              
              return (
                <div
                  key={date}
                  className={`
                    relative h-11 rounded-xl flex items-center justify-center text-sm font-medium
                    select-none transition-colors
                    ${viewMode === 'personal' ? 'cursor-pointer active:scale-95' : 'cursor-default'}
                    ${cellColor}
                    ${isToday ? 'ring-2 ring-[var(--accent)] ring-offset-2' : ''}
                  `}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCellDown(date);
                  }}
                  onMouseEnter={() => handleCellEnter(date)}
                  title={STATUS_NAMES[status]}
                >
                  {day}
                  {viewMode === 'group' && groupData && groupData.available.length > 0 && (
                    <span className="absolute -top-1 -right-1 text-[10px] min-w-[18px] h-[18px] rounded-full bg-white dark:bg-gray-900 border border-[var(--border)] flex items-center justify-center font-semibold text-[var(--text)]">
                      {groupData.available.length}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          
          {viewMode === 'personal' && (
            <p className="text-xs text-[var(--text-muted)] text-center mt-4">
              Click to cycle: Not set → Available → Maybe → Unavailable
            </p>
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {showLegend && (
            <div className="glass-card p-4">
              <h4 className="font-semibold text-sm text-[var(--text)] mb-3">
                {viewMode === 'personal' ? 'Legend' : 'Group Availability'}
              </h4>
              
              {viewMode === 'personal' ? (
                <div className="space-y-2">
                  {([1, 2, 3, 0] as StatusCode[]).map(code => (
                    <div key={code} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md ${
                        code === 0 ? 'bg-gray-200 dark:bg-gray-700' :
                        code === 1 ? 'bg-emerald-500' :
                        code === 2 ? 'bg-amber-400' : 'bg-red-500'
                      }`} />
                      <span className="text-sm text-[var(--text-muted)]">{STATUS_NAMES[code]}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-emerald-500 rounded-md" />
                    <span className="text-sm text-[var(--text-muted)]">75%+</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-emerald-400 rounded-md" />
                    <span className="text-sm text-[var(--text-muted)]">50-75%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-amber-400 rounded-md" />
                    <span className="text-sm text-[var(--text-muted)]">25-50%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-orange-300 rounded-md" />
                    <span className="text-sm text-[var(--text-muted)]">&lt;25%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'group' && bestDates.length > 0 && (
            <div className="glass-card p-4">
              <h4 className="font-semibold text-sm text-[var(--text)] mb-3">🎯 Best Dates</h4>
              <div className="space-y-2">
                {bestDates.map((d, i) => (
                  <div key={d.date} className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">{i + 1}. {d.formatted}</span>
                    <span className="font-medium text-[var(--accent)]">{d.available}/{participants.length}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card p-4">
            <h4 className="font-semibold text-sm text-[var(--text)] mb-3">Your Stats</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Available:</span>
                <span className="font-semibold text-emerald-500">{stats.available}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Maybe:</span>
                <span className="font-semibold text-amber-500">{stats.maybe}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Unavailable:</span>
                <span className="font-semibold text-red-500">{stats.unavailable}</span>
              </div>
            </div>
          </div>

          <button 
            className="btn-accent w-full" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '⏳ Saving...' : saveMessage || 'Save Availability'}
          </button>
        </div>
      </div>
    </div>
  );
}
