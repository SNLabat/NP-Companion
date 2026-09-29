import streamerLinks from "@/data/streamers.json";
import type { LiveResponse, LiveStream } from "@/lib/types";

/**
 * Twitch live status for NoPixel streams.
 * - Uses an app access token (client credentials), cached in memory.
 * - Pulls live GTA V streams and keeps the ones whose title mentions NoPixel.
 * - Merges the character -> streamer mapping from src/data/streamers.json and,
 *   when Supabase is configured, the `streamer_links` table.
 * Everything degrades to { enabled: false } without TWITCH_CLIENT_ID/SECRET.
 */

const GTA_V_GAME_ID = "32982";
const TITLE_RE = new RegExp(process.env.TWITCH_TITLE_FILTER || "no\\s?pixel|\\bnp\\b", "i");
const MAX_PAGES = 5; // 5 x 100 streams

let token: { value: string; expiresAt: number } | null = null;

async function appToken(clientId: string, secret: string) {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: secret, grant_type: "client_credentials" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Twitch token ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 };
  return token.value;
}

type HelixStream = {
  user_login: string;
  user_name: string;
  title: string;
  viewer_count: number;
  thumbnail_url: string;
  started_at: string;
};

async function helix(path: string, clientId: string, tok: string) {
  const res = await fetch(`https://api.twitch.tv/helix${path}`, {
    headers: { "Client-Id": clientId, Authorization: `Bearer ${tok}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Helix ${res.status} ${path}`);
  return res.json() as Promise<{ data: HelixStream[]; pagination?: { cursor?: string } }>;
}

const toStream = (s: HelixStream): LiveStream => ({
  login: s.user_login.toLowerCase(),
  displayName: s.user_name,
  title: s.title,
  viewers: s.viewer_count,
  thumbnailUrl: s.thumbnail_url.replace("{width}", "320").replace("{height}", "180"),
  startedAt: s.started_at,
});

async function loadLinks(): Promise<Record<string, string>> {
  const links: Record<string, string> = {};
  for (const l of (streamerLinks as { links: { username: string; twitch: string }[] }).links) {
    links[l.username.toLowerCase()] = l.twitch.toLowerCase();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      const res = await fetch(`${url}/rest/v1/streamer_links?select=username,twitch_login`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        next: { revalidate: 300 },
      });
      if (res.ok) {
        for (const r of (await res.json()) as { username: string; twitch_login: string }[]) {
          links[r.username.toLowerCase()] = r.twitch_login.toLowerCase();
        }
      }
    } catch (e) {
      console.warn("[live] streamer_links fetch failed", e);
    }
  }
  return links;
}

export async function getLive(): Promise<LiveResponse> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  const links = await loadLinks();
  if (!clientId || !secret) return { enabled: false, streams: [], links };

  const tok = await appToken(clientId, secret);
  const found = new Map<string, LiveStream>();

  // 1) Discover NoPixel streams from the GTA V directory.
  let cursor: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await helix(
      `/streams?game_id=${GTA_V_GAME_ID}&first=100${cursor ? `&after=${cursor}` : ""}`,
      clientId,
      tok,
    );
    for (const s of page.data) if (TITLE_RE.test(s.title)) found.set(s.user_login.toLowerCase(), toStream(s));
    cursor = page.pagination?.cursor;
    if (!cursor || page.data.length < 100) break;
  }

  // 2) Make sure every mapped streamer is checked, even small ones.
  const mapped = [...new Set(Object.values(links))].filter((l) => !found.has(l));
  for (let i = 0; i < mapped.length; i += 100) {
    const qs = mapped.slice(i, i + 100).map((l) => `user_login=${encodeURIComponent(l)}`).join("&");
    const page = await helix(`/streams?${qs}`, clientId, tok);
    for (const s of page.data) found.set(s.user_login.toLowerCase(), toStream(s));
  }

  const streams = [...found.values()].sort((a, b) => b.viewers - a.viewers);
  return { enabled: true, streams, links };
}
