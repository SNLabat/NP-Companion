import type { NextRequest } from "next/server";
import { getSource } from "@/lib/source";
import { cached, handle, noStore } from "@/lib/http";

const PAGE = 25;

/**
 * GET /api/search?q=&type=posts|users&cursor=
 * Upstream returns every match at once, so we paginate here (offset cursor)
 * and let the data cache absorb repeat pages.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return noStore({ items: [], nextCursor: null });

  if (sp.get("type") === "users") {
    return handle(() => getSource().searchUsers(q), (users) => cached({ items: users, nextCursor: null }, 60, 300));
  }

  const offset = Math.max(0, Number.parseInt(sp.get("cursor") ?? "0", 10) || 0);
  return handle(
    () => getSource().searchPosts(q),
    (posts) =>
      cached(
        {
          items: posts.slice(offset, offset + PAGE),
          nextCursor: offset + PAGE < posts.length ? String(offset + PAGE) : null,
          total: posts.length,
        },
        30,
        120,
      ),
  );
}
