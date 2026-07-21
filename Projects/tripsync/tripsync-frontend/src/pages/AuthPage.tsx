// src/pages/AuthPage.tsx
import { useState } from "react";

type AuthMode = "login" | "signup" | "tripcode";

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Simple top bar */}
      <header className="w-full border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white text-sm font-semibold">
              ✈️
            </div>
            <span className="text-lg font-semibold text-slate-900">TripSync</span>
          </div>
          <span className="text-xs text-slate-500">
            Plan trips together without the group chat chaos.
          </span>
        </div>
      </header>

      {/* Centered auth card */}
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Tabs */}
          <div className="mb-6 flex rounded-full border border-slate-200 bg-slate-100 p-1 text-sm font-medium">
            <button
              onClick={() => setMode("login")}
              className={
                "flex-1 rounded-full py-2 text-center " +
                (mode === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800")
              }
            >
              Login
            </button>
            <button
              onClick={() => setMode("signup")}
              className={
                "flex-1 rounded-full py-2 text-center " +
                (mode === "signup"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800")
              }
            >
              Sign Up
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {mode === "login" && <LoginForm onSwitchToTripCode={() => setMode("tripcode")} />}
            {mode === "signup" && <SignupForm />}
            {mode === "tripcode" && (
              <TripCodeForm
                onBackToLogin={() => setMode("login")}
                onBackToSignup={() => setMode("signup")}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function LoginForm({ onSwitchToTripCode }: { onSwitchToTripCode: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Welcome back</h1>
        <p className="text-sm text-slate-500">
          Sign in to your TripSync account to keep planning.
        </p>
      </div>

      <form className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="mt-2 w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Sign In
        </button>
      </form>

      <button
        type="button"
        onClick={onSwitchToTripCode}
        className="w-full text-center text-xs font-medium text-sky-700 hover:text-sky-800"
      >
        Have a trip code? Join a trip
      </button>
    </div>
  );
}

function SignupForm() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Create account</h1>
        <p className="text-sm text-slate-500">
          Start planning trips with friends. You can always join with a trip code later.
        </p>
      </div>

      <form className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Display Name</label>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
            placeholder="Salwa"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Home Airport</label>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
            placeholder="DFW, JFK, SFO..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
            placeholder="Create a strong password"
          />
        </div>

        <button
          type="submit"
          className="mt-2 w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Create Account
        </button>
      </form>
    </div>
  );
}

function TripCodeForm({
  onBackToLogin,
  onBackToSignup,
}: {
  onBackToLogin: () => void;
  onBackToSignup: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Join with a trip code</h1>
        <p className="text-sm text-slate-500">
          Paste the invite code your friend sent you. We’ll add this trip to your dashboard.
        </p>
      </div>

      <form className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Trip Code</label>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm uppercase tracking-widest outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
            placeholder="TS-4H92-KLQ7"
          />
        </div>

        <button
          type="submit"
          className="mt-2 w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Join Trip
        </button>
      </form>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <button
          type="button"
          onClick={onBackToLogin}
          className="font-medium text-sky-700 hover:text-sky-800"
        >
          Back to login
        </button>
        <button
          type="button"
          onClick={onBackToSignup}
          className="font-medium text-sky-700 hover:text-sky-800"
        >
          Need an account? Sign up
        </button>
      </div>
    </div>
  );
}
