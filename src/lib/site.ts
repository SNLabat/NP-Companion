export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "NoPixel Social";
export const SITE_DESCRIPTION =
  "Live mirror of the in-city Twatter feed from NoPixel V. Browse posts, threads, characters and city news, follow characters, and see who's live on Twitch.";

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
