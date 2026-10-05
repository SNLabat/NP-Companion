import { cached, handle } from "@/lib/http";
import { getMapSource } from "@/lib/map/sources";

/** GET /api/map -> MapFeed (events with world coordinates + unplaced items) */
export async function GET() {
  return handle(() => getMapSource().feed(), (feed) => cached(feed, 60, 300));
}
