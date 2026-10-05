/**
 * Multistream state lives in the URL so any setup can be shared:
 *   /watch?s=buddha,youngmulti,k:somekickname&layout=stage&main=t:buddha&chat=t:buddha
 * Bare names are Twitch; "k:" marks Kick.
 */

export type Platform = "twitch" | "kick";
export interface Pov {
  id: string; // "t:login" | "k:slug"
  platform: Platform;
  channel: string;
}
export type Layout = "grid" | "stage";

export const MAX_POVS = 12;

const TWITCH_RE = /^[a-z0-9_]{3,25}$/;
const KICK_RE = /^[a-z0-9_-]{1,64}$/;

export function makePov(platform: Platform, channel: string): Pov | null {
  const c = channel.trim().toLowerCase().replace(/^@/, "");
  if (platform === "twitch" ? !TWITCH_RE.test(c) : !KICK_RE.test(c)) return null;
  return { id: `${platform === "twitch" ? "t" : "k"}:${c}`, platform, channel: c };
}

/** Accepts "name", "t:name", "k:name", or pasted twitch.tv / kick.com URLs. */
export function parsePovToken(raw: string, fallback: Platform = "twitch"): Pov | null {
  const s = raw.trim();
  const url = s.match(/^(?:https?:\/\/)?(?:www\.|m\.)?(twitch\.tv|kick\.com)\/([^/?#\s]+)/i);
  if (url) return makePov(url[1].toLowerCase() === "kick.com" ? "kick" : "twitch", url[2]);
  const pre = s.match(/^([tk]):(.+)$/i);
  if (pre) return makePov(pre[1].toLowerCase() === "k" ? "kick" : "twitch", pre[2]);
  return makePov(fallback, s);
}

export function parsePovs(param: string | null): Pov[] {
  if (!param) return [];
  const seen = new Set<string>();
  const out: Pov[] = [];
  for (const tok of param.split(",")) {
    const p = parsePovToken(tok);
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
    if (out.length >= MAX_POVS) break;
  }
  return out;
}

export const serializePovs = (povs: Pov[]) =>
  povs.map((p) => (p.platform === "twitch" ? p.channel : `k:${p.channel}`)).join(",");

export const povUrl = (p: Pov) =>
  p.platform === "twitch" ? `https://www.twitch.tv/${p.channel}` : `https://kick.com/${p.channel}`;

/* ---------------- layout math ---------------- */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const RATIO = 16 / 9;

/** Biggest equal 16:9 tiles for n streams inside a box, centered. */
export function fitGrid(n: number, box: Rect, gap: number): Rect[] {
  if (n === 0 || box.w <= 0 || box.h <= 0) return [];
  let best = { cols: 1, rows: n, w: 0, h: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    let w = (box.w - gap * (cols - 1)) / cols;
    let h = w / RATIO;
    if (h * rows + gap * (rows - 1) > box.h) {
      h = (box.h - gap * (rows - 1)) / rows;
      w = h * RATIO;
    }
    if (w > best.w) best = { cols, rows, w, h };
  }
  const { cols, rows, w, h } = best;
  const totalH = rows * h + (rows - 1) * gap;
  const top = box.y + (box.h - totalH) / 2;
  const rects: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols);
    const inRow = r === rows - 1 ? n - r * cols : cols; // center a short last row
    const rowW = inRow * w + (inRow - 1) * gap;
    const left = box.x + (box.w - rowW) / 2;
    const c = i - r * cols;
    rects.push({ x: left + c * (w + gap), y: top + r * (h + gap), w, h });
  }
  return rects;
}

/** One large stream plus a strip of the rest (bottom on wide screens, right side if very wide). */
export function fitStage(n: number, box: Rect, gap: number): Rect[] {
  if (n <= 1) return fitGrid(n, box, gap);
  const others = n - 1;
  const sideStrip = box.w / box.h > 2.1;
  if (sideStrip) {
    const stripW = Math.max(180, box.w * 0.2);
    const main = fitGrid(1, { ...box, w: box.w - stripW - gap }, gap)[0];
    const strip = fitColumn(others, { x: box.x + box.w - stripW, y: box.y, w: stripW, h: box.h }, gap);
    return [main, ...strip];
  }
  const stripH = Math.max(90, Math.min(box.h * 0.24, 200));
  const main = fitGrid(1, { ...box, h: box.h - stripH - gap }, gap)[0];
  const strip = fitGrid(others, { x: box.x, y: box.y + box.h - stripH, w: box.w, h: stripH }, gap);
  return [main, ...strip];
}

function fitColumn(n: number, box: Rect, gap: number): Rect[] {
  const h = Math.min(box.w / RATIO, (box.h - gap * (n - 1)) / n);
  const w = h * RATIO;
  const total = n * h + (n - 1) * gap;
  const top = box.y + (box.h - total) / 2;
  return Array.from({ length: n }, (_, i) => ({ x: box.x + (box.w - w) / 2, y: top + i * (h + gap), w, h }));
}
