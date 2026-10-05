"use client";

import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { useLibrary } from "@/components/library";
import { PageHeader, Tabs } from "@/components/page-header";
import { PostList, Skeleton } from "@/components/post-list";
import { useLive } from "@/components/providers";
import { fetchJson, n } from "@/lib/format";
import type { Author, Page, Post, UserFeedFilter } from "@/lib/types";

export function ProfileView({ username, initialUser }: { username: string; initialUser: Author | null }) {
  const [filter, setFilter] = useState<UserFeedFilter>("posts");
  const lib = useLibrary();
  const { streamFor } = useLive();

  const { data: user, isError } = useQuery({
    queryKey: ["user", username.toLowerCase()],
    queryFn: () => fetchJson<Author>(`/api/users/${encodeURIComponent(username)}`),
    initialData: initialUser ?? undefined,
    staleTime: 5 * 60_000,
  });

  if (isError && !user) {
    return (
      <>
        <PageHeader title={`@${username}`} back />
        <p className="p-8 text-center text-muted">This account doesn&apos;t exist or the feed is unavailable.</p>
      </>
    );
  }
  if (!user) {
    return (
      <>
        <PageHeader title={`@${username}`} back />
        <Skeleton />
      </>
    );
  }

  const following = lib.isFollowing(user.id);
  const stream = streamFor(user.username);

  return (
    <>
      <PageHeader title={user.displayName} subtitle={`@${user.username}`} back />
      <section className="border-b border-line px-4 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <Avatar author={user} size={88} live={!!stream} />
          <button
            type="button"
            onClick={() =>
              lib.toggleFollow({ id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl })
            }
            aria-pressed={following}
            className={`group rounded-full px-5 py-2 font-semibold transition-colors ${
              following
                ? "border border-line hover:border-red-400 hover:text-red-500"
                : "bg-ink text-bg hover:opacity-90"
            }`}
          >
            {following ? (
              <>
                <span className="group-hover:hidden">Following</span>
                <span className="hidden group-hover:inline">Unfollow</span>
              </>
            ) : (
              "Follow"
            )}
          </button>
        </div>
        <h2 className="mt-3 text-xl font-bold">{user.displayName}</h2>
        <p className="text-muted">@{user.username}</p>

        {stream && (
          <Link
            href={`/watch?s=${stream.login}`}
            className="mt-3 flex items-center gap-3 rounded-xl border border-live/40 bg-live/5 p-3 hover:bg-live/10"
          >
            <Radio className="shrink-0 text-live" size={20} />
            <span className="min-w-0">
              <span className="block font-semibold">
                Live now as {stream.displayName} · {n(stream.viewers) || 0} watching
              </span>
              <span className="block truncate text-sm text-muted">{stream.title}</span>
            </span>
            <span className="ml-auto shrink-0 rounded-full bg-live px-3 py-1 text-sm font-semibold text-white">Watch</span>
          </Link>
        )}
      </section>

      <div className="border-b border-line">
        <Tabs
          tabs={[
            { value: "posts", label: "Posts" },
            { value: "replies", label: "Replies" },
            { value: "media", label: "Media" },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      <PostList
        key={`${user.id}-${filter}`}
        queryKey={["user-feed", user.id, filter]}
        fetchPage={(cursor) =>
          fetchJson<Page<Post>>(
            `/api/user-feed?userId=${user.id}&filter=${filter}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
          )
        }
        empty={filter === "media" ? "No photos yet." : filter === "replies" ? "No replies yet." : "No posts yet."}
      />
    </>
  );
}
