import type { NextRequest } from "next/server";
import { getSource } from "@/lib/source";
import { cached, cleanIds, handle, noStore, parseCursor, parseSort, parseTimeframe } from "@/lib/http";

const PAGE = 25;
const MAX_FOLLOWING = 200;
const MAX_BOOKMARKS = 5000;

/** GET /api/feed?sort=&timeframe=&cursor=   -> city feed (CDN cached) */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sort = parseSort(sp.get("sort"));
  const timeframe = parseTimeframe(sp.get("timeframe"));
  const cursor = parseCursor(sp.get("cursor"));
  return handle(
    () => getSource().cityFeed({ sort, timeframe, cursor }),
    (page) => cached(page, sort === "hottest" ? 30 : 8, 60),
  );
}

/**
 * POST /api/feed
 *   { type: "following", userIds: string[], sort?, cursor? }
 *   { type: "bookmarks", postIds: string[], cursor? }   (postIds newest-first)
 * Lists go in the body so there's no URL-length ceiling on follows/bookmarks.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return noStore({ error: "Invalid JSON" }, 400);
  }

  if (body.type === "following") {
    const userIds = cleanIds(body.userIds, MAX_FOLLOWING);
    const sort = parseSort(typeof body.sort === "string" ? body.sort : null);
    const cursor = parseCursor(body.cursor);
    return handle(() => getSource().followingFeed({ userIds, sort, cursor }), (p) => noStore(p));
  }

  if (body.type === "bookmarks") {
    const ids = cleanIds(body.postIds, MAX_BOOKMARKS);
    const offset = Math.max(0, Number.parseInt(String(body.cursor ?? "0"), 10) || 0);
    const slice = ids.slice(offset, offset + PAGE);
    return handle(
      () => getSource().postsByIds(slice),
      (items) => noStore({ items, nextCursor: offset + PAGE < ids.length ? String(offset + PAGE) : null }),
    );
  }

  return noStore({ error: "Unknown feed type" }, 400);
}
