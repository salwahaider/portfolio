// src/pages/SignupPage.tsx
import React, { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useBackground } from "../context/BackgroundProvider";

export function SignupPage() {
  const navigate = useNavigate();
  const { bgIndex, backgrounds } = useBackground();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);


  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
  
  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
  
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password , displayName: name }),
      });
  
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
          /* ignore non-JSON */
      }
  
      if (!res.ok) {
        alert(data.error || `Signup failed (${res.status})`);
        console.error("Signup error:", res.status, text);
        return;
      }
  
      localStorage.setItem("authToken", data.token);
  
      // ✅ go to the trips selector page
      navigate("/trips");
      } catch (err) {
        alert("Something went wrong while signing up.");
      }
    };



  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat transition-[background-image] duration-700"
      style={{ backgroundImage: `url(${backgrounds[bgIndex]})` }}
    >
      <div className="mx-4 max-w-5xl w-full rounded-[32px] bg-slate-900/40 backdrop-blur-2xl border border-white/25 shadow-[0_24px_80px_rgba(15,23,42,0.9)] text-slate-50 flex overflow-hidden">
        {/* Left side – marketing text */}
        <div className="hidden md:flex flex-col justify-center w-[45%] px-14 py-16 bg-gradient-to-br from-slate-900/60 via-slate-900/10 to-slate-900/40">
          <div className="mb-8 inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-emerald-400 shadow-lg shadow-emerald-400/40 text-xl">
            ✨
          </div>

          <h1 className="text-3xl leading-snug font-semibold tracking-tight">
            Create your TripSync space.
          </h1>

          <p className="mt-4 text-sm text-slate-200/85 max-w-sm leading-relaxed">
            Start a shared board, invite friends, collect dates and compare
            flight prices — all in one place.
          </p>

          <p className="mt-6 text-xs text-slate-300/80 max-w-sm leading-relaxed">
            You can always join an existing trip later with a code.
          </p>
        </div>

        {/* Right side – signup form */}
        <div className="w-full md:w-[55%] px-8 sm:px-10 py-10 sm:py-12 bg-slate-900/35">
          <div className="flex items-center justify-between text-xs mb-8">
            <span className="tracking-[0.28em] text-slate-200/80 uppercase">
              TRIPSYNC
            </span>
            <button
              type="button"
              className="btn btn-link no-underline p-0 h-auto min-h-0 text-[11px] text-indigo-200 hover:text-indigo-100"
              onClick={() => navigate("/login")}
            >
              Back to sign in
            </button>
          </div>

          <h2 className="text-2xl sm:text-[26px] font-semibold tracking-tight flex items-center gap-2">
            Create your account <span>🌍</span>
          </h2>
          <p className="mt-1 text-sm text-slate-200/80">
            Save trips, invite friends, and keep all your plans in sync.
          </p>

          <form onSubmit={handleSignup} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-200">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="input input-bordered w-full rounded-xl border-white/30 bg-white/15 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-300/70 shadow-[0_0_0_1px_rgba(15,23,42,0.25)] focus:outline-none focus:ring-2 focus:ring-sky-300/80 focus:border-transparent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-200">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input input-bordered w-full rounded-xl border-white/30 bg-white/15 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-300/70 shadow-[0_0_0_1px_rgba(15,23,42,0.25)] focus:outline-none focus:ring-2 focus:ring-sky-300/80 focus:border-transparent"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-200">Password</label>
                <button type="button" onClick={() => setShowPassword(v => !v)} className="text-[11px] text-slate-300/80 hover:text-slate-100">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input input-bordered w-full rounded-xl border-white/30 bg-white/15 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-300/70 shadow-[0_0_0_1px_rgba(15,23,42,0.25)] focus:outline-none focus:ring-2 focus:ring-sky-300/80 focus:border-transparent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-200">
                Confirm password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="input input-bordered w-full rounded-xl border-white/30 bg-white/15 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-300/70 shadow-[0_0_0_1px_rgba(15,23,42,0.25)] focus:outline-none focus:ring-2 focus:ring-sky-300/80 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              className="btn w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-sky-500 border-0 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(129,140,248,0.85)] hover:opacity-95 normal-case"
            >
              Create account
            </button>
          </form>

          <p className="mt-8 text-xs text-slate-300/90">
            Already have an account?{" "}
            <button
              type="button"
              className="btn btn-link no-underline p-0 h-auto min-h-0 font-semibold text-slate-50 hover:text-white underline underline-offset-[3px]"
              onClick={() => navigate("/login")}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
