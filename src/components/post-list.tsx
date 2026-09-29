"use client";

import { useInfiniteQuery, useQuery, type QueryKey } from "@tanstack/react-query";
import { ArrowUp, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { PostCard } from "@/components/post-card";
import { useSettings } from "@/components/providers";
import type { Page, Post } from "@/lib/types";


/**
 * Infinite, de-duplicated post list.
 * `live`: poll the first page while the tab is visible; if the reader is at
 * the top, new posts slide in, otherwise a "N new posts" pill appears.
 */
export function PostList({
  queryKey,
  fetchPage,
  live = false,
  liveInterval = 20_000,
  empty,
}: {
  queryKey: QueryKey;
  fetchPage: (cursor: string | null) => Promise<Page<Post>>;
  live?: boolean;
  /** ms between checks; keep per-user feeds slower since they can't share the CDN cache */
  liveInterval?: number;
  empty?: React.ReactNode;
}) {
  const { autoRefresh } = useSettings();
  const q = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

  const posts = useMemo(() => {
    const seen = new Set<string>();
    const out: Post[] = [];
    for (const p of q.data?.pages ?? [])
      for (const post of p.items) {
        if (seen.has(post.key)) continue;
        seen.add(post.key);
        out.push(post);
      }
    return out;
  }, [q.data]);

  // --- live head polling ---
  const at = (p: Post) => p.repostedAt ?? p.createdAt;
  const newestShown = posts.reduce((m, p) => Math.max(m, at(p)), 0);
  const pollOn = live && autoRefresh && q.isSuccess;
  const head = useQuery({
    queryKey: [...queryKey, "__head"],
    queryFn: () => fetchPage(null),
    enabled: pollOn,
    refetchInterval: pollOn ? liveInterval : false,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
  const fresh = useMemo(
    () => (head.data?.items ?? []).filter((p) => at(p) > newestShown && !posts.some((x) => x.key === p.key)),
    [head.data, newestShown, posts],
  );

  const showLatest = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    q.refetch();
  };

  useEffect(() => {
    if (fresh.length && window.scrollY < 150) q.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to new head data only
  }, [fresh.length]);

  // --- infinite scroll sentinel ---
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [q]);

  if (q.isPending) return <Skeleton />;
  if (q.isError)
    return (
      <div className="p-8 text-center">
        <p className="text-muted">{q.error.message}</p>
        <button type="button" onClick={() => q.refetch()} className="mt-3 rounded-full bg-brand px-4 py-2 font-semibold text-white">
          Try again
        </button>
      </div>
    );
  if (posts.length === 0) return <div className="p-8 text-center text-muted">{empty ?? "Nothing here yet."}</div>;

  return (
    <div>
      {fresh.length > 0 && (
        <button
          type="button"
          onClick={showLatest}
          className="fixed left-1/2 top-20 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold uppercase text-white shadow-lg md:left-[calc(50%-40px)]"
        >
          <ArrowUp size={16} /> {fresh.length >= 25 ? "25+" : fresh.length} new post{fresh.length === 1 ? "" : "s"}
        </button>
      )}
      {posts.map((p) => (
        <PostCard key={p.key} post={p} />
      ))}
      <div ref={sentinel} className="flex h-20 items-center justify-center text-muted">
        {q.isFetchingNextPage ? <Loader2 className="animate-spin" aria-label="Loading more" /> : !q.hasNextPage ? "You're all caught up." : null}
      </div>
    </div>
  );
}

export function Skeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-3 border-b border-line px-4 py-4">
          <div className="size-11 rounded-full bg-surface-2" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-surface-2" />
            <div className="h-3 w-5/6 rounded bg-surface-2" />
            <div className="h-3 w-2/3 rounded bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
