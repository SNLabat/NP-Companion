import { differenceInSeconds, format } from "date-fns";

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.error) message = j.error;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

export const postJson = <T,>(url: string, body: unknown) =>
  fetchJson<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Twitter-style short relative time: 12s, 5m, 3h, 2d, then "Sep 4". */
export function shortAgo(ms: number, now = Date.now()): string {
  const s = Math.max(0, differenceInSeconds(now, ms));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return format(ms, new Date(ms).getFullYear() === new Date(now).getFullYear() ? "MMM d" : "MMM d, yyyy");
}

export const fullDate = (ms: number) => format(ms, "h:mm a · MMM d, yyyy");

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
export const n = (v: number) => (v > 0 ? compact.format(v) : "");

export const postPath = (id: string) => `/social/status/${id}`;
export const userPath = (username: string) => `/social/${encodeURIComponent(username)}`;
