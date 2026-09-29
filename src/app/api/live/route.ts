import { getLive } from "@/lib/twitch";
import { cached, noStore } from "@/lib/http";

/** GET /api/live -> LiveResponse (live NoPixel streams + character links) */
export async function GET() {
  try {
    return cached(await getLive(), 60, 120);
  } catch (err) {
    console.error("[live]", err);
    return noStore({ enabled: false, streams: [], links: {} });
  }
}
