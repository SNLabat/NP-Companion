import { PLACES } from "@/data/places";
import type { Place, Precision } from "@/lib/map/types";

interface Matcher {
  place: Place;
  re: RegExp;
  len: number;
  strict: boolean; // dateline-only
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Longest aliases first so "Alamo Sea Boat Dock" wins over "Alamo".
const MATCHERS: Matcher[] = PLACES.flatMap((place) =>
  [place.name, ...(place.aliases ?? [])].map((alias) => ({
    place,
    re: new RegExp(`(^|[^\\p{L}\\p{N}])${escape(alias)}(?=$|[^\\p{L}\\p{N}])`, "iu"),
    len: alias.length,
    strict: !!place.ambiguous && alias === place.name,
  })),
).sort((a, b) => b.len - a.len);

export interface GeoMatch {
  place: Place;
  precision: Precision;
}

/**
 * Find where a story happened. Priority:
 *  1. a landmark named in the headline
 *  2. the story's dateline ("SANDY SHORES — ...")
 *  3. a landmark named in the body
 *  4. any district named in the headline, then the body
 */
export function geocode(headline: string, body: string): GeoMatch | null {
  const find = (text: string, kind?: Place["kind"], dateline = false) =>
    MATCHERS.find((m) => (dateline || !m.strict) && (!kind || m.place.kind === kind) && m.re.test(text))?.place ?? null;
  const as = (place: Place | null): GeoMatch | null =>
    place ? { place, precision: place.kind === "landmark" ? "place" : "area" } : null;

  const dateline = body.match(/^\s*([A-Z][A-Z .'-]{2,40}?)\s*[—–-]{1,2}\s/)?.[1];

  return (
    as(find(headline, "landmark")) ??
    (dateline ? as(find(dateline, undefined, true)) : null) ??
    as(find(body, "landmark")) ??
    as(find(headline)) ??
    as(find(body))
  );
}
