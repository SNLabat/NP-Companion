import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProfileView } from "@/components/profile-view";
import { getSource } from "@/lib/source";

const loadUser = cache(async (username: string) => {
  try {
    return await getSource().userByUsername(decodeURIComponent(username));
  } catch {
    return undefined; // upstream down: render client-side instead of 404
  }
});

export async function generateMetadata({ params }: PageProps<"/social/[username]">): Promise<Metadata> {
  const { username } = await params;
  const user = await loadUser(username);
  if (!user) return { title: `@${decodeURIComponent(username)}` };
  const title = `${user.displayName} (@${user.username})`;
  const description = `Posts from ${user.displayName} (@${user.username}) on Twatter, live from the city.`;
  return {
    title,
    description,
    alternates: { canonical: `/social/${encodeURIComponent(user.username)}` },
    openGraph: {
      type: "profile",
      title,
      description,
      url: `/social/${encodeURIComponent(user.username)}`,
      images: [{ url: `/api/og/user/${encodeURIComponent(user.username)}`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProfilePage({ params }: PageProps<"/social/[username]">) {
  const { username } = await params;
  const user = await loadUser(username);
  if (user === null) notFound();
  return <ProfileView username={decodeURIComponent(username)} initialUser={user ?? null} />;
}
