export interface TripMember {
  id: number;
  name: string;
  displayName?: string;
  role: string;
  status: string;
  isCurrentUser: boolean;
  guest: boolean;
  creator?: boolean;
  joinedAt: string;
  homeAirport?: string | null;
  originAirport?: string | null;
  originCity?: string | null;
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];

export function getAvatarColor(index: number, isCurrentUser: boolean): string {
  if (isCurrentUser) return "bg-[var(--accent)]";
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function getMemberInitial(name: string): string {
  return name?.charAt(0).toUpperCase() || "?";
}

export function formatOrigin(airport: string | null | undefined, city: string | null | undefined): string {
  if (city && airport) return `${city} (${airport})`;
  if (airport) return airport;
  if (city) return city;
  return "Unknown";
}
