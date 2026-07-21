// src/pages/LoginPage.tsx
import React, { useState } from "react";
import type { FormEvent } from "react";
import { useBackground } from "../context/BackgroundProvider";
import { useNavigate, Link, useSearchParams } from "react-router-dom";

export function LoginPage() {
  const navigate = useNavigate();
  const { bgIndex, backgrounds } = useBackground();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tripCode, setTripCode] = useState("");
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);

  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestAirport, setGuestAirport] = useState("");

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState<"email" | "reset">("email");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirm, setForgotConfirm] = useState("");
  const [forgotShowPw, setForgotShowPw] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");

  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("invite"); // may be null

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

  const handleForgotSubmitEmail = (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotStep("reset");
    setForgotMessage("");
  };

  const handleForgotReset = async (e: FormEvent) => {
    e.preventDefault();
    if (forgotNewPassword !== forgotConfirm) {
      setForgotMessage("Passwords do not match.");
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotMessage("Password must be at least 6 characters.");
      return;
    }
    setForgotLoading(true);
    setForgotMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, newPassword: forgotNewPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setForgotMessage(data.error || "Reset failed. Please try again.");
      } else {
        setForgotMessage("Password updated! You can now sign in.");
        setEmail(forgotEmail);
        setTimeout(() => {
          setForgotOpen(false);
          setForgotStep("email");
          setForgotEmail("");
          setForgotNewPassword("");
          setForgotConfirm("");
          setForgotMessage("");
        }, 1800);
      }
    } catch {
      setForgotMessage("Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

    const handleSignIn = async (e: FormEvent) => {
  e.preventDefault();

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      /* ignore non-JSON */
    }

    if (!res.ok) {
      alert(data.error || `Login failed (${res.status})`);
      console.error("Login error:", res.status, text);
      return;
    }

    // save token
    localStorage.setItem("authToken", data.token);

    // 🔑 If we came from an invite link, join that trip as the logged-in user
    if (inviteCode) {
      try {
        const joinRes = await fetch(
          `${API_BASE_URL}/invite/${inviteCode}/join`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.token}`,
            },
          }
        );

        const joinText = await joinRes.text();
        let joinData: any = {};
        try {
          joinData = joinText ? JSON.parse(joinText) : {};
        } catch {
          /* ignore */
        }

        if (joinRes.ok && joinData.tripId) {
          // go straight to the invited trip
          navigate(`/trip/${joinData.tripId}`);
          return;
        } else {
          console.warn("Failed to join invited trip:", joinText);
        }
      } catch (err) {
        console.error("Error joining invited trip:", err);
      }
    }

    // ✅ default: go to the trips selector page
    navigate("/trips");
  } catch (err) {
    console.error("Login network/CORS error:", err);
    alert("Something went wrong while logging in.");
  }
};



const handleJoinClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  const code = tripCode.trim();
  if (!code) return;

  // First click: reveal the guest form
  if (!showGuestForm) {
    setShowGuestForm(true);
    return;
  }

  // Second click: actually call the backend
  setIsJoiningByCode(true);
  try {
    const res = await fetch(`${API_BASE_URL}/invite/${code}/join-guest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        displayName: guestName.trim() || "Guest",
        homeAirport: guestAirport.trim().toUpperCase() || "UNKNOWN",
      }),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      /* ignore non-JSON */
    }

    if (!res.ok) {
      alert(data.error || "Invalid or expired trip code.");
      return;
    }

    const tripId = data.tripId;
    const memberId = data.memberId;

    if (!tripId || !memberId) {
      alert("Could not join this trip. Please try again.");
      return;
    }

    // Clear any real auth token so this session is clearly "guest"
    localStorage.removeItem("authToken");

    // 🔑 Remember which TripMember row is "you" for this trip
    localStorage.setItem(
      `guestMemberForTrip_${tripId}`,
      String(memberId)
    );

    // go straight to the trip dashboard as a guest
    navigate(`/trip/${tripId}`);
  } catch (err) {
    console.error("Join with code failed:", err);
    alert("Something went wrong while joining with code.");
  } finally {
    setIsJoiningByCode(false);
  }
};

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center">
      {/* Cross-fading background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {backgrounds.map((src, index) => (
          <div
            key={src}
            className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[1200ms] ease-out ${
              index === bgIndex ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        <div className="absolute inset-0 bg-slate-900/40" />
      </div>

      {/* Glass container */}
      <div className="mx-4 max-w-5xl w-full rounded-[32px] bg-slate-900/40 backdrop-blur-2xl border border-white/25 shadow-[0_24px_80px_rgba(15,23,42,0.9)] text-slate-50 flex overflow-hidden">
        {/* Left Marketing */}
        <div className="hidden md:flex flex-col justify-center w-[45%] px-14 py-16 bg-gradient-to-br from-slate-900/60 via-slate-900/10 to-slate-900/40">
          <div className="mb-8 inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-emerald-400 shadow-lg shadow-emerald-400/40 text-xl">
            ✈️
          </div>

          <h1 className="text-3xl leading-snug font-semibold tracking-tight">
            Shared boards, heatmaps &amp; AI flight scouting.
          </h1>
          <p className="mt-4 text-sm text-slate-200/85 max-w-sm leading-relaxed">
            See who’s free, where the best deals are, and what everyone wants to
            do — all in one place.
          </p>
          <p className="mt-6 text-xs text-slate-300/80 max-w-sm leading-relaxed">
            Friends are already planning. See who&apos;s free &amp; where the best
            deals are.
          </p>
        </div>

        {/* Right Login Form */}
        <div className="w-full md:w-[55%] px-8 sm:px-10 py-10 sm:py-12 bg-slate-900/35">
          <div className="flex items-center justify-between text-xs mb-8">
            <span className="tracking-[0.28em] text-slate-200/80 uppercase">
              TRIPSYNC
            </span>
            <button
              type="button"
              className="btn btn-link no-underline p-0 h-auto min-h-0 text-[11px] text-indigo-200 hover:text-indigo-100"
              onClick={() => alert("Support coming soon!")}
            >
              Need help?
            </button>
          </div>

          <h2 className="text-2xl sm:text-[26px] font-semibold tracking-tight flex items-center gap-2">
            Welcome back <span>👋</span>
          </h2>
          <p className="mt-1 text-sm text-slate-200/80">
            Sign in to see your trips, votes, and group plans.
          </p>

          {/* Form */}
          <form onSubmit={handleSignIn} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-200">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input input-bordered w-full rounded-xl border-white/30 bg-white/15 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-300/70 shadow-[0_0_0_1px_rgba(15,23,42,0.25)] focus:outline-none focus:ring-2 focus:ring-sky-300/80"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-200">
                <span>Password</span>
                <button
                  type="button"
                  onClick={() => { setForgotOpen(true); setForgotStep("email"); setForgotMessage(""); }}
                  className="btn btn-link no-underline p-0 h-auto min-h-0 text-[11px] text-slate-200/80 hover:text-slate-100"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input input-bordered w-full rounded-xl border-white/30 bg-white/15 px-3 py-2 pr-10 text-sm text-slate-100 placeholder:text-slate-300/70 shadow-[0_0_0_1px_rgba(15,23,42,0.25)] focus:outline-none focus:ring-2 focus:ring-sky-300/80"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300/70 hover:text-slate-100"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn w-full mt-2 py-2.5 rounded-xl bg-white/18 border border-white/35 text-sm font-medium text-slate-50 shadow-[0_18px_40px_rgba(15,23,42,0.9)] hover:bg-white/28 hover:border-white/60 normal-case"
            >
              Sign in
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 flex items-center gap-4 text-[11px] uppercase tracking-[0.24em] text-slate-200/90">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300/40 to-transparent" />
            <span>Or join with code</span>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300/40 to-transparent" />
          </div>

          {/* OR JOIN WITH CODE */}
          <div className="mt-10">
            <p className="text-xs font-medium tracking-[0.16em] text-slate-400 mb-3">
              OR JOIN WITH CODE
            </p>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
              {/* Trip code field */}
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter trip code"
                  value={tripCode}
                  onChange={(e) => setTripCode(e.target.value)}
                  className="
                    w-full rounded-xl px-4 py-3
                    bg-white text-gray-900
                    focus:ring-2 focus:ring-purple-400 focus:outline-none
                  "
                />
                <button
                  type="button"
                  onClick={handleJoinClick}
                  disabled={isJoiningByCode || !tripCode.trim()}
                  className="rounded-2xl px-5 py-3 text-sm font-semibold text-white
                            bg-gradient-to-r from-fuchsia-500 to-violet-500
                            shadow-[0_0_32px_rgba(147,51,234,0.65)]
                            disabled:opacity-60 disabled:shadow-none"
                >
                  {showGuestForm ? (isJoiningByCode ? "Joining…" : "Join trip") : "Join"}
                </button>
              </div>

              {/* NEW: guest info fields appear AFTER they enter a code and tap Join once */}
              {showGuestForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-300">
                      Your name
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Salwa Haider"
                      className="rounded-2xl bg-white/6 px-4 py-3 text-sm text-black
                                placeholder:text-slate-500 border border-white/10
                                focus:outline-none focus:ring-2 focus:ring-violet-400/70
                                focus:border-violet-400/60"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-300">
                      Home airport
                    </label>
                    <input
                      type="text"
                      value={guestAirport}
                      onChange={(e) => setGuestAirport(e.target.value.toUpperCase())}
                      placeholder="e.g. AUS, SFO, JFK"
                      className="rounded-2xl bg-white/6 px-4 py-3 text-sm text-black
                                placeholder:text-slate-500 border border-white/10
                                focus:outline-none focus:ring-2 focus:ring-violet-400/70
                                focus:border-violet-400/60"
                    />
                  </div>
                </div>
              )}
            </form>
          </div>


          {/* Footer */}
          <p className="mt-8 text-xs text-slate-300/90">
            Don’t have an account yet?{" "}
            <Link
              to="/signup"
              className="btn btn-link no-underline p-0 h-auto min-h-0 font-semibold text-slate-50 hover:text-white underline underline-offset-[3px]"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-2xl bg-slate-900 border border-white/20 shadow-2xl p-8 text-slate-50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Reset password</h3>
              <button
                type="button"
                onClick={() => { setForgotOpen(false); setForgotStep("email"); setForgotMessage(""); }}
                className="text-slate-400 hover:text-slate-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {forgotStep === "email" ? (
              <form onSubmit={handleForgotSubmitEmail} className="space-y-4">
                <p className="text-sm text-slate-300">Enter your email address to reset your password.</p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="input input-bordered w-full rounded-xl border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/70"
                />
                <button
                  type="submit"
                  className="btn w-full rounded-xl bg-sky-500 hover:bg-sky-400 border-0 text-sm font-semibold text-white normal-case"
                >
                  Continue
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotReset} className="space-y-4">
                <p className="text-sm text-slate-300">
                  Set a new password for <span className="font-medium text-slate-100">{forgotEmail}</span>.
                </p>
                <div className="relative">
                  <input
                    type={forgotShowPw ? "text" : "password"}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="New password"
                    required
                    className="input input-bordered w-full rounded-xl border-white/20 bg-white/10 px-3 py-2 pr-10 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/70"
                  />
                  <button type="button" onClick={() => setForgotShowPw(v => !v)} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100">
                    {forgotShowPw ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                <input
                  type={forgotShowPw ? "text" : "password"}
                  value={forgotConfirm}
                  onChange={(e) => setForgotConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="input input-bordered w-full rounded-xl border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/70"
                />
                {forgotMessage && (
                  <p className={`text-xs ${forgotMessage.includes("updated") ? "text-emerald-400" : "text-red-400"}`}>
                    {forgotMessage}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForgotStep("email")}
                    className="btn flex-1 rounded-xl bg-white/10 hover:bg-white/20 border-0 text-sm font-medium text-slate-200 normal-case"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn flex-1 rounded-xl bg-sky-500 hover:bg-sky-400 border-0 text-sm font-semibold text-white normal-case disabled:opacity-60"
                  >
                    {forgotLoading ? "Saving…" : "Reset password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
