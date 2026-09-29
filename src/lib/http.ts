import { NextResponse } from "next/server";
import { UpstreamError } from "@/lib/source";
import type { FeedSort, Timeframe, UserFeedFilter } from "@/lib/types";

/** JSON response that Vercel's CDN may cache for `sMaxAge` seconds. */
export function cached(data: unknown, sMaxAge = 10, swr = 60) {
  return NextResponse.json(data, {
    headers: { "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}` },
  });
}

export function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handle<T>(fn: () => Promise<T>, respond: (v: T) => Response): Promise<Response> {
  try {
    return respond(await fn());
  } catch (err) {
    console.error("[api]", err);
    if (err instanceof UpstreamError && err.status === 429) {
      return NextResponse.json(
        { error: "The feed is busy right now. Retrying shortly." },
        { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } },
      );
    }
    const status = err instanceof UpstreamError ? 502 : 500;
    const message =
      err instanceof UpstreamError
        ? "The social feed source is not responding. Try again in a moment."
        : "Something went wrong.";
    return noStore({ error: message }, status);
  }
}

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const isId = (v: unknown): v is string => typeof v === "string" && ID_RE.test(v);
export const cleanIds = (v: unknown, max: number): string[] =>
  Array.isArray(v) ? [...new Set(v.filter(isId))].slice(0, max) : [];

export const parseSort = (v: string | null): FeedSort => (v === "hottest" ? "hottest" : "chronological");
export const parseTimeframe = (v: string | null): Timeframe => (v === "7d" || v === "all" ? v : "24h");
export const parseFilter = (v: string | null): UserFeedFilter =>
  v === "replies" || v === "media" ? v : "posts";
export const parseCursor = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 && v.length < 512 ? v : null;
