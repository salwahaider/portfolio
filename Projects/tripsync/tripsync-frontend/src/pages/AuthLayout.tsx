// src/pages/AuthLayout.tsx
import React from "react";
import { Link } from "react-router-dom";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
  footer,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-sky-100 dark:from-[#050816] dark:via-[#050816] dark:to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-5xl rounded-3xl bg-white/90 dark:bg-slate-900/90 shadow-2xl overflow-hidden flex border border-primary-100 dark:border-slate-700">
        {/* Left illustration panel */}
        <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-primary-500 via-fuchsia-500 to-amber-400 relative items-end justify-center p-8">
          {/* Glass overlay card */}
          <div className="absolute inset-6 rounded-3xl bg-white/5 backdrop-blur-md border border-white/20" />

          <div className="relative z-10 flex flex-col gap-4 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Plan trips together, stress-free
            </div>

            <h2 className="text-2xl font-semibold leading-snug">
              Turn group chats into
              <br />
              <span className="font-bold">actual trips ✈️</span>
            </h2>

            <p className="text-sm text-purple-100 max-w-xs">
              Shared boards, availability heatmaps, and AI flight scouting – all in
              one place.
            </p>

            <div className="mt-4 flex items-center gap-3 text-xs text-purple-100/90">
              <div className="flex -space-x-2">
                <div className="h-7 w-7 rounded-full border border-white/30 bg-white/20" />
                <div className="h-7 w-7 rounded-full border border-white/30 bg-white/20" />
                <div className="h-7 w-7 rounded-full border border-white/30 bg-white/20" />
              </div>
              <div>
                <div className="font-medium">Friends are already planning</div>
                <div>See who’s free & where the best deals are</div>
              </div>
            </div>
          </div>

          {/* Simple abstract “blob” */}
          <div className="pointer-events-none absolute -bottom-16 -right-10 h-40 w-40 rounded-[40%] bg-white/10 blur-2xl" />
        </div>

        {/* Right form panel */}
        <div className="w-full md:w-3/5 p-8 md:p-10 flex flex-col">
          {/* Logo + tiny nav */}
          <div className="flex items-center justify-between mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"
            >
              <div className="h-8 w-8 rounded-2xl bg-gradient-to-tr from-primary-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold">
                TS
              </div>
              TripSync
            </Link>

            <button className="text-xs text-slate-500 dark:text-slate-300 hover:text-primary-500">
              Need help?
            </button>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="space-y-4 flex-1">{children}</div>

            {footer && (
              <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
