import { getSource } from "@/lib/source";
import type { Post } from "@/lib/types";

export interface TrendingTag {
  tag: string;
  posts: number;
  likes: number;
}

const TAG_RE = /#([\p{L}\p{N}_]{3,40})/gu;
const RECENT_PAGES = 4; // ~100 latest posts; kept small to respect upstream rate limits

/** Rank hashtags by how many distinct recent posts use them. */
export async function getTrending(limit = 10): Promise<TrendingTag[]> {
  const src = getSource();
  const hotP = src.cityFeed({ sort: "hottest", timeframe: "24h" });
  const recent: Post[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < RECENT_PAGES; i++) {
    const page = await src.cityFeed({ sort: "chronological", timeframe: "24h", cursor });
    recent.push(...page.items);
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  const hot = await hotP;

  const seen = new Set<string>();
  const counts = new Map<string, { n: number; likes: number; spellings: Map<string, number> }>();
  for (const p of [...recent, ...hot.items]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const tags = new Set<string>();
    for (const m of p.content.matchAll(TAG_RE)) tags.add(m[1]);
    for (const t of tags) {
      const key = t.toLowerCase();
      const e = counts.get(key) ?? { n: 0, likes: 0, spellings: new Map() };
      e.n++;
      e.likes += p.likeCount;
      e.spellings.set(t, (e.spellings.get(t) ?? 0) + 1);
      counts.set(key, e);
    }
  }

  // Repeated use matters most; engagement breaks ties and surfaces big one-offs.
  const score = (e: { n: number; likes: number }) => e.n * 100 + Math.log2(1 + e.likes) * 20;
  return [...counts.values()]
    .filter((e) => e.n >= 2 || e.likes >= 25)
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit)
    .map((e) => ({
      tag: [...e.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0],
      posts: e.n,
      likes: e.likes,
    }));
}
