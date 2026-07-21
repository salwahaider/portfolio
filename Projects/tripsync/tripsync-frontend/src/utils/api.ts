// src/utils/api.ts

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("authToken");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // Check if this is a guest-accessible endpoint
  const isGuestEndpoint = 
    path.startsWith("/invite/") ||
    path.match(/^\/trips\/\d+$/) ||           // GET /trips/123
    path.match(/^\/trips\/\d+\/members/);     // GET /trips/123/members

  // ❌ 401 Unauthorized → Token expired/invalid → redirect to login
  if (response.status === 401) {
    if (!isGuestEndpoint) {
      localStorage.removeItem("authToken");
      window.location.href = "/login";
      throw new Error("Session expired, please login again.");
    }
    throw new Error("Unauthorized");
  }

  // ❌ 403 Forbidden → User authenticated but not allowed
  // Don't auto-redirect, let the calling code handle it
  if (response.status === 403) {
    const text = await response.text();
    console.error("403 Forbidden:", path, text);
    
    // Check if it's actually an auth issue (token problem)
    if (text.includes("JWT") || text.includes("token") || text.includes("expired")) {
      localStorage.removeItem("authToken");
      window.location.href = "/login";
      throw new Error("Session expired, please login again.");
    }
    
    throw new Error(text || "You don't have permission to do this.");
  }

  // ❌ Non-OK response → show user-friendly text
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  // ✅ Return parsed JSON (or null for empty responses)
  const text = await response.text();
  if (!text) {
    return null as T;
  }
  return JSON.parse(text) as T;
}

// ============================================
// GUEST API - Never sends token, never redirects
// Use this for invite preview, guest join, etc.
// ============================================
export async function guestApi<T>(path: string, options: RequestInit = {}) {
  const tripId = /\/trip\/(\d+)/.exec(window.location.href)?.[1];
  const guestKey = tripId ? localStorage.getItem(`guestMemberForTrip_${tripId}`) : null;

  const headers: any = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // send guest header
  if (guestKey) {
    headers["X-Guest-Id"] = guestKey;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}

  if (!res.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data as T;
}
