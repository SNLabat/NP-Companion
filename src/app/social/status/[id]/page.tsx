import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ThreadView } from "@/components/thread-view";
import { getSource } from "@/lib/source";
import { SITE_NAME } from "@/lib/site";

const loadThread = cache(async (id: string) => {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  try {
    return await getSource().thread(id);
  } catch {
    return undefined;
  }
});

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

export async function generateMetadata({ params }: PageProps<"/social/status/[id]">): Promise<Metadata> {
  const { id } = await params;
  const thread = await loadThread(id);
  if (!thread) return { title: "Post" };

  const { post } = thread;
  const who = `${post.author.displayName} (@${post.author.username})`;
  const text = post.content.trim() || (post.attachments.length ? "📷 Photo" : "");
  const title = `${who}: "${clip(text, 70)}"`;
  const description = clip(text, 200);
  const photo = post.attachments.find((a) => a.kind === "image" && a.fullUrl);
  const image = photo
    ? { url: photo.fullUrl!, width: photo.width ?? undefined, height: photo.height ?? undefined, alt: `Photo posted by ${who}` }
    : { url: `/api/og/post/${post.id}`, width: 1200, height: 630, alt: `${who} on Twatter` };

  return {
    title,
    description,
    alternates: { canonical: `/social/status/${post.id}` },
    openGraph: {
      type: "article",
      title: `${who} on Twatter`,
      description,
      url: `/social/status/${post.id}`,
      siteName: SITE_NAME,
      publishedTime: new Date(post.createdAt).toISOString(),
      images: [image],
    },
    twitter: { card: "summary_large_image", title: `${who} on Twatter`, description, images: [image.url] },
  };
}

export default async function StatusPage({ params }: PageProps<"/social/status/[id]">) {
  const { id } = await params;
  const thread = await loadThread(id);
  if (thread === null) notFound();
  return <ThreadView id={id} initialThread={thread ?? null} />;
}
