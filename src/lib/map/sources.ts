import { getSource } from "@/lib/source";
import { geocode } from "@/lib/map/geocode";
import type { MapEvent, MapFeed, UnplacedEvent } from "@/lib/map/types";

/**
 * Where map events come from. Like SocialSource, this is the seam for the
 * official Companion map-events data: add an adapter that returns MapFeed
 * and set MAP_SOURCE. Nothing in the UI needs to change.
 */
export interface MapSource {
  name: string;
  label: string;
  feed(): Promise<MapFeed>;
}

const KIND_BY_CATEGORY: Record<string, string> = {
  breaking_news: "breaking",
  public_notice: "notice",
  report: "report",
  interview: "report",
};

const NEWS_PAGES = 2; // ~50 most recent stories

/** City news, pinned by the landmarks and datelines they mention. */
const newsSource: MapSource = {
  name: "news",
  label: "City news, placed by the locations they mention",
  async feed() {
    const src = getSource();
    const items = [];
    let cursor: string | null = null;
    for (let i = 0; i < NEWS_PAGES; i++) {
      const page = await src.news(cursor);
      items.push(...page.items);
      cursor = page.nextCursor;
      if (!cursor) break;
    }

    const events: MapEvent[] = [];
    const unplaced: UnplacedEvent[] = [];
    for (const n of items) {
      const kind = KIND_BY_CATEGORY[n.category] ?? "report";
      const hit = geocode(n.headline, n.body);
      if (!hit) {
        unplaced.push({ id: n.id, kind, title: n.headline, description: n.body, at: n.createdAt });
        continue;
      }
      events.push({
        id: n.id,
        kind,
        title: n.headline,
        description: n.body,
        x: hit.place.x,
        y: hit.place.y,
        precision: hit.precision,
        placeName: hit.place.name,
        at: n.createdAt,
        people: n.authorName ? [{ name: n.authorName }] : undefined,
        source: "news",
      });
    }
    return { source: "news", sourceLabel: this.label, events, unplaced, updatedAt: Date.now() };
  },
};

const sources: Record<string, MapSource> = { news: newsSource };

export function getMapSource(): MapSource {
  return sources[process.env.MAP_SOURCE || "news"] ?? newsSource;
}
