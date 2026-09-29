import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && key);

let client: SupabaseClient | null = null;

/** Browser Supabase client, or null when accounts aren't configured. */
export function supabase(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  client ??= createBrowserClient(url!, key!);
  return client;
}
