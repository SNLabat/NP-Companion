import { cached, handle } from "@/lib/http";
import { getTrending } from "@/lib/trending";

/** GET /api/trending -> TrendingTag[] (hashtags across recent + hottest posts) */
export async function GET() {
  return handle(() => getTrending(10), (tags) => cached(tags, 300, 900));
}
