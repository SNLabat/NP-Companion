import type { NextRequest } from "next/server";
import { getSource } from "@/lib/source";
import { cached, handle, isId, noStore, parseCursor, parseFilter, parseSort } from "@/lib/http";

/** GET /api/user-feed?userId=&filter=posts|replies|media&sort=&cursor= */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const userId = sp.get("userId");
  if (!isId(userId)) return noStore({ error: "Bad userId" }, 400);
  return handle(
    () =>
      getSource().userFeed({
        userId,
        filter: parseFilter(sp.get("filter")),
        sort: parseSort(sp.get("sort")),
        cursor: parseCursor(sp.get("cursor")),
      }),
    (page) => cached(page, 15, 60),
  );
}
