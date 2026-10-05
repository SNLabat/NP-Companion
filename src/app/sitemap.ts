import type { MetadataRoute } from "next";
import { getSource } from "@/lib/source";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

/** Static sections plus the hottest recent posts and their authors. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/social`, changeFrequency: "always", priority: 1 },
    { url: `${base}/news`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/live`, changeFrequency: "always", priority: 0.6 },
    { url: `${base}/watch`, changeFrequency: "always", priority: 0.7 },
    { url: `${base}/map`, changeFrequency: "hourly", priority: 0.7 },
  ];
  try {
    const src = getSource();
    const pages = await Promise.all([
      src.cityFeed({ sort: "hottest", timeframe: "24h" }),
      src.cityFeed({ sort: "hottest", timeframe: "7d" }),
    ]);
    const posts = [...new Map(pages.flatMap((p) => p.items).map((p) => [p.id, p])).values()];
    const users = new Set<string>();
    for (const p of posts) {
      entries.push({ url: `${base}/social/status/${p.id}`, lastModified: new Date(p.createdAt), priority: 0.5 });
      users.add(p.author.username);
    }
    for (const u of users) entries.push({ url: `${base}/social/${encodeURIComponent(u)}`, priority: 0.4 });
  } catch {
    /* upstream down: static entries only */
  }
  return entries;
}
