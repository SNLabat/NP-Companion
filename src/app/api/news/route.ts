import type { NextRequest } from "next/server";
import { getSource } from "@/lib/source";
import { cached, handle, parseCursor } from "@/lib/http";

/** GET /api/news?cursor= -> Page<NewsItem> */
export async function GET(req: NextRequest) {
  const cursor = parseCursor(req.nextUrl.searchParams.get("cursor"));
  return handle(() => getSource().news(cursor), (page) => cached(page, 60, 300));
}
