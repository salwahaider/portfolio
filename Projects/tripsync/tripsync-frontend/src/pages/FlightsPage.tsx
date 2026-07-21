import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../utils/api";

type Theme = "light" | "dark";
type SearchMode = "personal" | "group";

interface Trip { id: number; name: string; destination: string; }
interface TripMember { id: number; displayName: string; homeAirport: string | null; guest: boolean; creator: boolean; isCurrentUser: boolean; }
interface RouteSegment { airline: string; flightNo: string; fromAirport: string; toAirport: string; departure: string; arrival: string; }
interface FlightResult { id: string; airline: string; flightNumber: string; departureAirport: string; arrivalAirport: string; departureCity: string; arrivalCity: string; departureTime: string; arrivalTime: string; price: number; currency: string; stops: number; durationMinutes: number; bookingLink: string; bookingToken: string; segments: RouteSegment[]; }
interface MemberFlights { memberId: number; memberName: string; homeAirport: string; flights: FlightResult[]; }
interface SyncedFlight { memberId: number; memberName: string; flight: FlightResult; }
interface SyncedGroup { flights: SyncedFlight[]; totalPrice: number; arrivalSpreadMinutes: number; earliestArrival: string; latestArrival: string; }
interface SelectedFlight { id: number; memberId: number; memberName: string; direction: string; airline: string; flightNumber: string; departureAirport: string; arrivalAirport: string; departureTime: string; arrivalTime: string; price: number; currency: string; stops: number; durationMinutes: number; bookingLink: string; }

export default function FlightsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("tripsync-theme");
    return saved === "dark" || saved === "light" ? saved : "light";
  });

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("personal");

  const [personalResults, setPersonalResults] = useState<FlightResult[]>([]);
  const [memberFlights, setMemberFlights] = useState<MemberFlights[]>([]);
  const [syncedGroups, setSyncedGroups] = useState<SyncedGroup[]>([]);
  const [selectedFlights, setSelectedFlights] = useState<SelectedFlight[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"results" | "synced" | "booked">("booked");

  const [searchForm, setSearchForm] = useState({
    flyFrom: "", flyTo: "", dateFrom: "", returnFrom: "",
    maxStopovers: -1, sort: "price", arrivalWindowHours: 2,
  });

  const currentUser = members.find((m) => m.isCurrentUser);

  const fetchData = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const [tripData, membersData, selectedData] = await Promise.all([
        api<Trip>(`/trips/${tripId}`),
        api<TripMember[]>(`/trips/${tripId}/members`),
        api<SelectedFlight[]>(`/trips/${tripId}/flights/selected`).catch(() => [] as SelectedFlight[]),
      ]);
      setTrip(tripData);
      setMembers(membersData);
      setSelectedFlights(selectedData);
      const me = membersData.find((m: TripMember) => m.isCurrentUser);
      if (me?.homeAirport) setSearchForm(p => ({ ...p, flyFrom: me.homeAirport! }));
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("tripsync-theme", theme);
  }, [theme]);

  const handlePersonalSearch = async () => {
    if (!searchForm.flyFrom || !searchForm.flyTo || !searchForm.dateFrom) {
      alert("Please enter from airport, to airport, and departure date.");
      return;
    }
    setSearching(true);
    try {
      const body: Record<string, unknown> = {
        flyFrom: searchForm.flyFrom.toUpperCase(),
        flyTo: searchForm.flyTo.toUpperCase(),
        dateFrom: searchForm.dateFrom,
        sort: searchForm.sort,
      };
      if (searchForm.maxStopovers >= 0) body.maxStopovers = searchForm.maxStopovers;
      if (searchForm.returnFrom) body.returnFrom = searchForm.returnFrom;
      const results = await api<FlightResult[]>(`/trips/${tripId}/flights/search`, { method: "POST", body: JSON.stringify(body) });
      setPersonalResults(results);
      setActiveTab("results");
    } catch (err: any) {
      alert(err.message || "Flight search failed. Check your airports and date.");
    } finally {
      setSearching(false);
    }
  };

  const handleGroupSearch = async () => {
    if (!searchForm.flyTo || !searchForm.dateFrom) {
      alert("Please enter destination airport and departure date.");
      return;
    }
    setSearching(true);
    try {
      const body: Record<string, unknown> = {
        flyTo: searchForm.flyTo.toUpperCase(),
        dateFrom: searchForm.dateFrom,
        dateTo: searchForm.dateFrom,
        sort: searchForm.sort,
        arrivalWindowHours: searchForm.arrivalWindowHours,
      };
      if (searchForm.maxStopovers >= 0) body.maxStopovers = searchForm.maxStopovers;
      if (searchForm.returnFrom) body.returnFrom = searchForm.returnFrom;
      const result = await api<{ memberFlights: MemberFlights[]; syncedGroups: SyncedGroup[] }>(
        `/trips/${tripId}/flights/search-group`, { method: "POST", body: JSON.stringify(body) }
      );
      setMemberFlights(result.memberFlights);
      setSyncedGroups(result.syncedGroups);
      setActiveTab("results");
    } catch (err: any) {
      alert(err.message || "Group search failed.");
    } finally {
      setSearching(false);
    }
  };

  const handleSaveToTrip = async (flight: FlightResult, direction = "outbound") => {
    setSavingId(flight.id + direction);
    try {
      const parseToISO = (dt: string) => {
        if (!dt) return new Date().toISOString();
        if (dt.includes("T") || dt.includes("Z")) return dt;
        return new Date(dt.replace(" ", "T") + ":00").toISOString();
      };
      await api(`/trips/${tripId}/flights/select`, {
        method: "POST",
        body: JSON.stringify({
          direction,
          airline: flight.airline,
          flightNumber: flight.flightNumber,
          departureAirport: flight.departureAirport,
          arrivalAirport: flight.arrivalAirport,
          departureTime: parseToISO(flight.departureTime),
          arrivalTime: parseToISO(flight.arrivalTime),
          price: flight.price,
          currency: flight.currency || "USD",
          stops: flight.stops,
          durationMinutes: flight.durationMinutes,
          bookingLink: flight.bookingLink,
        }),
      });
      await fetchData();
      setActiveTab("booked");
    } catch (err: any) {
      alert(err.message || "Failed to save flight.");
    } finally {
      setSavingId(null);
    }
  };

  const handleRemoveSelection = async (direction: string) => {
    try {
      await api(`/trips/${tripId}/flights/select/${direction}`, { method: "DELETE" });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const fmt = {
    dur: (m: number) => { const h = Math.floor(m / 60); const mm = m % 60; return h > 0 ? `${h}h ${mm}m` : `${mm}m`; },
    time: (s: string) => { try { return new Date(s.includes("T") ? s : s.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return s; } },
    date: (s: string) => { try { return new Date(s.includes("T") ? s : s.replace(" ", "T")).toLocaleDateString([], { month: "short", day: "numeric" }); } catch { return s; } },
  };

  if (loading) {
    return (
      <div className="min-h-screen page-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  const totalGroupCost = selectedFlights.reduce((s, f) => s + f.price, 0);

  return (
    <div className="min-h-screen flex page-gradient text-[var(--text)]">
      {/* SIDEBAR */}
      <aside className="sidebar w-72 flex flex-col shrink-0 border-r border-[var(--border)] bg-white/80 dark:bg-[#1a1a24] backdrop-blur-xl h-screen sticky top-0 overflow-y-auto">
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <div className="sidebar-logo h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-bold cursor-pointer" onClick={() => navigate("/trips")}>TS</div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">TripSync</span>
            <span className="text-xs text-[var(--text-muted)]">Group travel made easy</span>
          </div>
        </div>
        <nav className="mt-4 flex-1 space-y-2 px-4">
          <button className="sidebar-link w-full flex items-center gap-3 px-4 py-3 rounded-2xl" onClick={() => navigate(`/trip/${tripId}`)}>
            <span className="text-xl">🗺️</span><span className="text-sm font-medium">Trip Board</span>
          </button>
          <button className="sidebar-link w-full flex items-center gap-3 px-4 py-3 rounded-2xl" onClick={() => navigate(`/trip/${tripId}/itinerary`)}>
            <span className="text-xl">📋</span><span className="text-sm font-medium">Itinerary</span>
          </button>
          <button className="sidebar-nav-active w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl">
            <span className="flex items-center gap-3"><span className="text-xl">✈️</span><span className="text-sm font-medium">Flights</span></span>
            <span className="active-chip text-[10px] px-2 py-0.5 rounded-full">Active</span>
          </button>
          <button className="sidebar-link w-full flex items-center gap-3 px-4 py-3 rounded-2xl"><span className="text-xl">🏨</span><span>Hotels</span></button>
          <button className="sidebar-link w-full flex items-center gap-3 px-4 py-3 rounded-2xl" onClick={() => navigate(`/trip/${tripId}/split-costs`)}>
            <span className="text-xl">💰</span><span>Split costs</span>
          </button>
        </nav>
        <div className="px-4 pb-6 pt-2">
          <div className="account-chip flex items-center gap-3">
            <div className="account-avatar">{currentUser?.displayName.charAt(0).toUpperCase() || "?"}</div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{currentUser?.displayName || "Guest"}</span>
              <span className="text-xs text-[var(--text-muted)]">{currentUser?.guest ? "Guest" : "Free plan"}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">
        <header className="border-b border-[var(--border)] bg-[var(--panel)] backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Flights</h1>
              <p className="text-xs text-[var(--text-muted)]">{trip?.name}</p>
            </div>
            <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} className="theme-toggle">
              {theme === "dark" ? "☀️" : "🌙"} <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">

            {/* MODE TOGGLE */}
            <div className="flex gap-2">
              {(["personal", "group"] as const).map(mode => (
                <button key={mode} onClick={() => setSearchMode(mode)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${searchMode === mode ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] text-[var(--text-muted)] border border-[var(--card-border)]"}`}>
                  {mode === "personal" ? "My flight" : "Group search"}
                </button>
              ))}
            </div>

            {/* SEARCH PANEL */}
            <div className="glass-card rounded-3xl p-6">
              {searchMode === "personal" ? (
                <>
                  <h2 className="text-lg font-bold mb-1">Search flights</h2>
                  <p className="text-sm text-[var(--text-muted)] mb-4">Live prices from Google Flights. Search, then save the one you book so your group can see your travel plans.</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1">From</label>
                      <input type="text" value={searchForm.flyFrom} onChange={e => setSearchForm(p => ({ ...p, flyFrom: e.target.value }))} placeholder="AUS" maxLength={5} className="trips-input w-full uppercase" />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1">To</label>
                      <input type="text" value={searchForm.flyTo} onChange={e => setSearchForm(p => ({ ...p, flyTo: e.target.value }))} placeholder="LAX" maxLength={5} className="trips-input w-full uppercase" />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1">Departure</label>
                      <input type="date" value={searchForm.dateFrom} onChange={e => setSearchForm(p => ({ ...p, dateFrom: e.target.value }))} className="trips-input w-full" />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1">Return (optional)</label>
                      <input type="date" value={searchForm.returnFrom} onChange={e => setSearchForm(p => ({ ...p, returnFrom: e.target.value }))} className="trips-input w-full" />
                    </div>
                  </div>
                  <div className="flex gap-3 items-center mb-4 flex-wrap">
                    <select value={searchForm.maxStopovers} onChange={e => setSearchForm(p => ({ ...p, maxStopovers: parseInt(e.target.value) }))} className="trips-input">
                      <option value={-1}>Any stops</option>
                      <option value={0}>Non-stop only</option>
                      <option value={1}>Max 1 stop</option>
                      <option value={2}>Max 2 stops</option>
                    </select>
                    <select value={searchForm.sort} onChange={e => setSearchForm(p => ({ ...p, sort: e.target.value }))} className="trips-input">
                      <option value="price">Cheapest first</option>
                      <option value="duration">Shortest first</option>
                      <option value="quality">Best overall</option>
                    </select>
                  </div>
                  <button onClick={handlePersonalSearch} disabled={searching} className="btn-accent px-6">
                    {searching ? "Searching Google Flights…" : "Search flights"}
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold mb-1">Group flight search</h2>
                  <p className="text-sm text-[var(--text-muted)] mb-4">Searches from each member's home airport. Finds combos where everyone arrives within your time window.</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1">Destination airport</label>
                      <input type="text" value={searchForm.flyTo} onChange={e => setSearchForm(p => ({ ...p, flyTo: e.target.value }))} placeholder="LAX" maxLength={5} className="trips-input w-full uppercase" />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1">Departure date</label>
                      <input type="date" value={searchForm.dateFrom} onChange={e => setSearchForm(p => ({ ...p, dateFrom: e.target.value }))} className="trips-input w-full" />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1">Arrival window</label>
                      <select value={searchForm.arrivalWindowHours} onChange={e => setSearchForm(p => ({ ...p, arrivalWindowHours: parseInt(e.target.value) }))} className="trips-input w-full">
                        {[1,2,3,4].map(h => <option key={h} value={h}>{h} hr window</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1">Max stops</label>
                      <select value={searchForm.maxStopovers} onChange={e => setSearchForm(p => ({ ...p, maxStopovers: parseInt(e.target.value) }))} className="trips-input w-full">
                        <option value={-1}>Any</option>
                        <option value={0}>Non-stop</option>
                        <option value={1}>1 stop</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {members.map(m => (
                      <span key={m.id} className="text-xs px-3 py-1 rounded-full bg-[var(--accent-light)] text-[var(--accent)] font-medium">
                        {m.displayName}: {m.homeAirport || "no airport"}
                      </span>
                    ))}
                  </div>
                  <button onClick={handleGroupSearch} disabled={searching} className="btn-accent px-6">
                    {searching ? "Searching for everyone…" : "Search for everyone"}
                  </button>
                </>
              )}
            </div>

            {/* RESULT TABS */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setActiveTab("results")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "results" ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] text-[var(--text-muted)]"}`}>
                Results {searchMode === "personal" && personalResults.length > 0 ? `(${personalResults.length})` : searchMode === "group" && memberFlights.length > 0 ? `(${memberFlights.reduce((s, mf) => s + mf.flights.length, 0)})` : ""}
              </button>
              {searchMode === "group" && (
                <button onClick={() => setActiveTab("synced")}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "synced" ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] text-[var(--text-muted)]"}`}>
                  Synced arrivals {syncedGroups.length > 0 && `(${syncedGroups.length})`}
                </button>
              )}
              <button onClick={() => setActiveTab("booked")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "booked" ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] text-[var(--text-muted)]"}`}>
                Saved flights {selectedFlights.length > 0 && `(${selectedFlights.length})`}
              </button>
            </div>

            {/* PERSONAL RESULTS */}
            {activeTab === "results" && searchMode === "personal" && (
              personalResults.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center">
                  <p className="text-[var(--text-muted)]">Search above to see live flights from Google Flights.</p>
                </div>
              ) : (
                <div className="glass-card rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">{personalResults.length} flights found</h3>
                    <p className="text-xs text-[var(--text-muted)]">Live prices from Google Flights · click "Save" on the one you book</p>
                  </div>
                  <div className="space-y-2">
                    {personalResults.map((flight, i) => (
                      <FlightRow key={flight.id || i} flight={flight} fmt={fmt}
                        savingId={savingId}
                        returnDate={searchForm.returnFrom || undefined}
                        onSave={() => handleSaveToTrip(flight, "outbound")}
                        onSaveReturn={searchForm.returnFrom ? () => handleSaveToTrip(flight, "return") : undefined}
                      />
                    ))}
                  </div>
                </div>
              )
            )}

            {/* GROUP RESULTS */}
            {activeTab === "results" && searchMode === "group" && (
              memberFlights.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center">
                  <p className="text-[var(--text-muted)]">Search above to find flights for everyone in the group.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {memberFlights.map(mf => (
                    <div key={mf.memberId} className="glass-card rounded-3xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-sm">
                          {mf.memberName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold">{mf.memberName}</h3>
                          <p className="text-xs text-[var(--text-muted)]">From {mf.homeAirport || "unknown"} · {mf.flights.length} flights found</p>
                        </div>
                      </div>
                      {mf.flights.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)]">No flights found.{!mf.homeAirport && " No home airport set."}</p>
                      ) : (
                        <div className="space-y-2">
                          {mf.flights.slice(0, 6).map((flight, i) => (
                            <FlightRow key={flight.id || i} flight={flight} fmt={fmt}
                              savingId={savingId}
                              returnDate={searchForm.returnFrom || undefined}
                              onSave={mf.memberId === currentUser?.id ? () => handleSaveToTrip(flight, "outbound") : undefined}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* SYNCED ARRIVALS */}
            {activeTab === "synced" && (
              syncedGroups.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center">
                  <h3 className="text-lg font-semibold mb-2">No synced arrivals found</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {memberFlights.length === 0 ? "Run a group search first." : `No combos where everyone arrives within ${searchForm.arrivalWindowHours}h. Try widening the window.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {syncedGroups.map((group, gi) => (
                    <div key={gi} className="glass-card rounded-3xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold">Option {gi + 1}</h3>
                          <p className="text-sm text-[var(--text-muted)]">Everyone arrives within {group.arrivalSpreadMinutes} min of each other</p>
                        </div>
                        <span className="text-2xl font-bold text-[var(--accent)]">~${group.totalPrice.toFixed(0)}</span>
                      </div>
                      <div className="space-y-2">
                        {group.flights.map(sf => (
                          <div key={sf.memberId} className="flex items-center justify-between p-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center text-xs font-bold">
                                {sf.memberName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{sf.memberName}</p>
                                <p className="text-xs text-[var(--text-muted)]">{sf.flight.departureAirport} → {sf.flight.arrivalAirport} · {sf.flight.airline} {sf.flight.flightNumber} · {sf.flight.stops === 0 ? "Non-stop" : `${sf.flight.stops} stop`}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-bold text-[var(--accent)]">~${sf.flight.price}</p>
                                <p className="text-xs text-[var(--text-muted)]">Arrives {fmt.time(sf.flight.arrivalTime)}</p>
                              </div>
                              {sf.memberId === currentUser?.id && (
                                <button onClick={() => handleSaveToTrip(sf.flight, "outbound")} disabled={savingId === sf.flight.id + "outbound"}
                                  className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white disabled:opacity-50">
                                  {savingId === sf.flight.id + "outbound" ? "…" : "Save"}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* SAVED FLIGHTS */}
            {activeTab === "booked" && (
              selectedFlights.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center">
                  <div className="text-5xl mb-4">✈️</div>
                  <h3 className="text-lg font-semibold mb-2">No flights saved yet</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm mx-auto">Search for a flight above and click "Save" on the one you're booking. Everyone in the group can see saved flights.</p>
                  <button onClick={() => setActiveTab("results")} className="btn-accent px-6">Search flights</button>
                </div>
              ) : (
                <>
                  <div className="glass-card rounded-3xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold">Group flight summary</h3>
                        <p className="text-sm text-[var(--text-muted)]">{selectedFlights.length} flight{selectedFlights.length !== 1 ? "s" : ""} saved</p>
                      </div>
                      {totalGroupCost > 0 && (
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[var(--accent)]">${totalGroupCost.toFixed(0)}</p>
                          <p className="text-xs text-[var(--text-muted)]">Total group flight cost</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {members.map(member => {
                    const ms = selectedFlights.filter(sf => sf.memberId === member.id);
                    if (ms.length === 0) return null;
                    return (
                      <div key={member.id} className="glass-card rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-sm">
                            {member.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold">{member.displayName}</h3>
                            <p className="text-xs text-[var(--text-muted)]">From {member.homeAirport || "unknown"}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {ms.map(sf => (
                            <div key={sf.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--card)] border border-[var(--card-border)]">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sf.direction === "outbound" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"}`}>
                                    {sf.direction === "outbound" ? "Outbound" : "Return"}
                                  </span>
                                  <span className="text-sm font-medium">{sf.airline} {sf.flightNumber}</span>
                                </div>
                                <p className="text-sm font-semibold">{sf.departureAirport} → {sf.arrivalAirport}</p>
                                <p className="text-xs text-[var(--text-muted)]">
                                  {fmt.date(sf.departureTime)} {fmt.time(sf.departureTime)} → {fmt.time(sf.arrivalTime)}
                                  {" · "}{sf.stops === 0 ? "Non-stop" : `${sf.stops} stop${sf.stops > 1 ? "s" : ""}`}
                                  {sf.durationMinutes > 0 && ` · ${Math.floor(sf.durationMinutes/60)}h ${sf.durationMinutes%60}m`}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 ml-4">
                                {sf.price > 0 && <span className="text-lg font-bold text-[var(--accent)]">${sf.price}</span>}
                                {member.isCurrentUser && (
                                  <button onClick={() => handleRemoveSelection(sf.direction)} className="text-[var(--text-muted)] hover:text-red-500 text-xl leading-none">✕</button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getBookingLinks(flight: FlightResult, returnDate?: string) {
  const from = flight.departureAirport;
  const to = flight.arrivalAirport;
  const dep = flight.departureTime?.substring(0, 10) ?? "";
  const ret = returnDate || "";
  const isRT = !!ret;

  const google = isRT
    ? `https://www.google.com/travel/flights#flt=${from}.${to}.${dep}*${to}.${from}.${ret};c:USD;e:1;sd:1;t:r`
    : `https://www.google.com/travel/flights#flt=${from}.${to}.${dep};c:USD;e:1;sd:1;t:f`;

  const kayak = isRT
    ? `https://www.kayak.com/flights/${from}-${to}/${dep}/${to}-${from}/${ret}`
    : `https://www.kayak.com/flights/${from}-${to}/${dep}`;

  let airline: { label: string; url: string } | null = null;
  const a = (flight.airline || "").toLowerCase();
  if (a.includes("southwest")) {
    airline = { label: "Southwest", url: `https://www.southwest.com/air/booking/select.html?originationAirportCode=${from}&destinationAirportCode=${to}&departureDate=${dep}${isRT ? `&returnDate=${ret}&tripType=ROUND_TRIP` : "&tripType=ONE_WAY"}&adultPassengersCount=1&fareType=USD` };
  } else if (a.includes("american")) {
    airline = { label: "American", url: `https://www.aa.com/booking/find-flights?tripType=${isRT ? "RT" : "OW"}&origin0=${from}&destination0=${to}&departureDate0=${dep}${isRT ? `&origin1=${to}&destination1=${from}&departureDate1=${ret}` : ""}` };
  } else if (a.includes("united")) {
    airline = { label: "United", url: `https://www.united.com/ual/en/US/flight-search/book-a-flight/results/rev?f=${from}&t=${to}&d=${dep}${isRT ? `&r=${ret}&tt=2` : "&tt=1"}` };
  } else if (a.includes("delta")) {
    airline = { label: "Delta", url: `https://www.delta.com/us/en/flight-search/book-a-flight?tripType=${isRT ? "ROUND_TRIP" : "ONE_WAY"}&fromAirportCode=${from}&toAirportCode=${to}&departureDate=${dep}${isRT ? `&returnDate=${ret}` : ""}` };
  } else if (a.includes("frontier")) {
    airline = { label: "Frontier", url: `https://booking.flyfrontier.com/flight/search?src=${from}&dst=${to}&dep=${dep}${isRT ? `&ret=${ret}&type=RT` : "&type=OW"}&ADT=1` };
  } else if (a.includes("spirit")) {
    airline = { label: "Spirit", url: `https://www.spirit.com/Book/Flight?origin=${from}&destination=${to}&departDate=${dep}${isRT ? `&returnDate=${ret}&roundTrip=true` : "&roundTrip=false"}` };
  } else if (a.includes("alaska")) {
    airline = { label: "Alaska", url: `https://www.alaskaair.com/booking/choose-guests?A=1&type=${isRT ? "roundtrip" : "oneway"}&origin=${from}&dest=${to}&D1=${dep}${isRT ? `&D2=${ret}` : ""}` };
  } else if (a.includes("jetblue")) {
    airline = { label: "JetBlue", url: `https://www.jetblue.com/booking/flights?from=${from}&to=${to}&depart=${dep}${isRT ? `&return=${ret}` : ""}&adults=1&children=0&infants=0` };
  }

  return { google, kayak, airline };
}

function FlightRow({ flight, fmt, savingId, onSave, onSaveReturn, returnDate }: {
  flight: FlightResult;
  fmt: { dur: (m: number) => string; time: (s: string) => string; date: (s: string) => string };
  savingId: string | null;
  returnDate?: string;
  onSave?: () => void;
  onSaveReturn?: () => void;
}) {
  const [showBooking, setShowBooking] = useState(false);
  const { google, kayak, airline } = getBookingLinks(flight, returnDate);
  const isRT = !!returnDate;

  return (
    <div className="rounded-xl bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--accent)] transition-colors overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        {/* Airline badge */}
        <div className="w-12 h-12 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-[10px] font-bold text-[var(--accent)] shrink-0 text-center leading-tight px-1">
          {flight.airline || "?"}
        </div>

        {/* Route info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base font-bold">{fmt.time(flight.departureTime)}</span>
            <span className="text-[var(--text-muted)] text-sm">→</span>
            <span className="text-base font-bold">{fmt.time(flight.arrivalTime)}</span>
            <span className="text-xs text-[var(--text-muted)] ml-1">{fmt.date(flight.arrivalTime)}</span>
            {isRT && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">Round-trip</span>}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {flight.departureAirport} → {flight.arrivalAirport}
            {" · "}{flight.stops === 0 ? "Non-stop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
            {flight.durationMinutes > 0 && ` · ${fmt.dur(flight.durationMinutes)}`}
            {flight.flightNumber && ` · ${flight.flightNumber}`}
          </p>
        </div>

        {/* Price + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right mr-1">
            <p className="text-lg font-bold text-[var(--accent)]">${flight.price}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{isRT ? "round-trip" : "one-way"}</p>
          </div>

          <button onClick={() => setShowBooking(b => !b)}
            className="text-xs px-3 py-2 rounded-lg border border-[var(--card-border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors whitespace-nowrap">
            Book ↗
          </button>

          {onSave && (
            <button onClick={onSave} disabled={savingId === flight.id + "outbound"}
              className="text-xs px-3 py-2 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap">
              {savingId === flight.id + "outbound" ? "Saving…" : "Save"}
            </button>
          )}
          {onSaveReturn && (
            <button onClick={onSaveReturn} disabled={savingId === flight.id + "return"}
              className="text-xs px-3 py-2 rounded-lg bg-emerald-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap">
              {savingId === flight.id + "return" ? "…" : "+ Return"}
            </button>
          )}
        </div>
      </div>

      {/* Booking links panel */}
      {showBooking && (
        <div className="border-t border-[var(--card-border)] px-4 py-3 flex flex-wrap gap-2 bg-[var(--panel)]">
          <span className="text-xs text-[var(--text-muted)] self-center mr-1">Book on:</span>
          <a href={google} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-medium">
            ✈ Google Flights
          </a>
          <a href={kayak} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors font-medium">
            🔍 Kayak
          </a>
          {airline && (
            <a href={airline.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors font-medium">
              🏷 {airline.label} Direct
            </a>
          )}
          <span className="text-[10px] text-[var(--text-muted)] self-center ml-1">Prices update in real-time on these sites</span>
        </div>
      )}
    </div>
  );
}
