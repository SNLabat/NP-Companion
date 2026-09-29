import { readerSource } from "./reader";
import type { SocialSource } from "./types";

export type { SocialSource } from "./types";
export { UpstreamError } from "./types";

/**
 * Pick the active data source. Add new adapters here (e.g. a Supabase-backed
 * "companion" ingest) and switch with the SOCIAL_SOURCE env var; nothing
 * else in the app needs to change.
 */
const sources: Record<string, SocialSource> = {
  reader: readerSource,
};

export function getSource(): SocialSource {
  const key = process.env.SOCIAL_SOURCE || "reader";
  return sources[key] ?? readerSource;
}
