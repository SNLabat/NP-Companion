"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLibrary } from "@/components/library";
import { PageHeader, Tabs } from "@/components/page-header";
import { PostList, Skeleton } from "@/components/post-list";
import { useSettings } from "@/components/providers";
import { fetchJson, postJson } from "@/lib/format";
import type { FeedSort, Page, Post, Timeframe } from "@/lib/types";

type Tab = "city" | "following" | "bookmarks";

export function FeedView() {
  const router = useRouter();
  const params = useSearchParams();
  const lib = useLibrary();
  const { autoRefresh, setAutoRefresh } = useSettings();

  const tab: Tab = params.get("tab") === "following" ? "following" : params.get("tab") === "bookmarks" ? "bookmarks" : "city";
  const sort: FeedSort = params.get("sort") === "hottest" ? "hottest" : "chronological";
  const timeframe: Timeframe = params.get("t") === "7d" || params.get("t") === "all" ? (params.get("t") as Timeframe) : "24h";

  const setParam = (updates: Record<string, string | null>) => {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    router.replace(qs ? `/social?${qs}` : "/social", { scroll: false });
  };

  const followIds = lib.follows.map((f) => f.id).sort();

  return (
    <>
      <PageHeader title={tab === "city" ? "City feed" : tab === "following" ? "Following" : "Bookmarks"}>
        <Tabs
          tabs={[
            { value: "city", label: "City" },
            { value: "following", label: `Following${lib.follows.length ? ` (${lib.follows.length})` : ""}` },
            { value: "bookmarks", label: "Bookmarks" },
          ]}
          value={tab}
          onChange={(v) => setParam({ tab: v === "city" ? null : v })}
        />
        {tab !== "bookmarks" && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2 text-sm">
            <Chip active={sort === "chronological"} onClick={() => setParam({ sort: null, t: null })}>
              Latest
            </Chip>
            <Chip active={sort === "hottest"} onClick={() => setParam({ sort: "hottest" })}>
              Hottest
            </Chip>
            {sort === "hottest" && (
              <select
                value={timeframe}
                onChange={(e) => setParam({ t: e.target.value === "24h" ? null : e.target.value })}
                aria-label="Timeframe"
                className="rounded-full border border-line bg-surface px-3 py-1"
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="all">All time</option>
              </select>
            )}
            {sort === "chronological" && (
              <label className="ml-auto flex cursor-pointer items-center gap-2 text-muted">
                <span className={`size-2 rounded-full ${autoRefresh ? "animate-pulse bg-live" : "bg-line"}`} aria-hidden />
                Live updates
                <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="accent-[var(--brand)]" />
              </label>
            )}
          </div>
        )}
      </PageHeader>

      {!lib.ready ? (
        <Skeleton />
      ) : tab === "city" ? (
        <PostList
          key={`city-${sort}-${timeframe}`}
          queryKey={["feed", "city", sort, timeframe]}
          live={sort === "chronological"}
          fetchPage={(cursor) =>
            fetchJson<Page<Post>>(
              `/api/feed?sort=${sort}&timeframe=${timeframe}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
            )
          }
        />
      ) : tab === "following" ? (
        lib.follows.length === 0 ? (
          <Empty title="You're not following anyone yet">
            Open a character&apos;s profile and hit <b>Follow</b>. Their posts will collect here.
          </Empty>
        ) : (
          <PostList
            key={`following-${sort}`}
            queryKey={["feed", "following", sort, followIds.join(",")]}
            live={sort === "chronological"}
            liveInterval={60_000}
            fetchPage={(cursor) => postJson<Page<Post>>("/api/feed", { type: "following", userIds: followIds, sort, cursor })}
          />
        )
      ) : lib.bookmarks.length === 0 ? (
        <Empty title="No bookmarks yet">Tap the bookmark icon on any post to save it here.</Empty>
      ) : (
        <PostList
          queryKey={["feed", "bookmarks", lib.bookmarks.join(",")]}
          fetchPage={(cursor) => postJson<Page<Post>>("/api/feed", { type: "bookmarks", postIds: lib.bookmarks, cursor })}
          empty="Your bookmarked posts may have been deleted."
        />
      )}
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 transition-colors ${
        active ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line text-muted hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-sm px-6 py-16 text-center">
      <h2 className="font-display text-3xl font-bold uppercase">{title}</h2>
      <p className="mt-2 text-muted">{children}</p>
      <Link href="/social" className="mt-5 inline-block rounded-full bg-brand px-5 py-2 font-semibold text-white">
        Browse the city
      </Link>
    </div>
  );
}
