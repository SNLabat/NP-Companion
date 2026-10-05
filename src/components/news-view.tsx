"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Megaphone, Siren } from "lucide-react";
import { useEffect, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/post-list";
import { RichText } from "@/components/rich-text";
import { useNow } from "@/components/use-now";
import { fetchJson, fullDate, shortAgo } from "@/lib/format";
import type { NewsItem, Page } from "@/lib/types";

const CATEGORY: Record<string, { label: string; className: string; icon: typeof Megaphone }> = {
  breaking_news: { label: "Breaking", className: "bg-live text-white", icon: Siren },
  public_notice: { label: "Public notice", className: "bg-brand-soft text-brand", icon: Megaphone },
};

export function NewsView() {
  const now = useNow();
  const q = useInfiniteQuery({
    queryKey: ["news"],
    queryFn: ({ pageParam }) =>
      fetchJson<Page<NewsItem>>(`/api/news${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`),
    initialPageParam: null as string | null,
    getNextPageParam: (p) => p.nextCursor,
    refetchInterval: 120_000,
  });

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [q]);

  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  // Deep links (/news#<id>, e.g. from the map): load a few pages if needed, then scroll to the story.
  const pagesTried = q.data?.pages.length ?? 0;
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id || !q.data) return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ block: "start" });
    else if (q.hasNextPage && !q.isFetchingNextPage && pagesTried < 4) q.fetchNextPage();
  }, [q, pagesTried]);

  return (
    <>
      <PageHeader title="City news" subtitle="Bulletins, public notices and breaking news" />
      {q.isPending ? (
        <Skeleton />
      ) : q.isError ? (
        <p className="p-8 text-center text-muted">{q.error.message}</p>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          {items.map((item) => {
            const cat = CATEGORY[item.category] ?? {
              label: item.category.replace(/_/g, " "),
              className: "bg-surface-2 text-muted",
              icon: Megaphone,
            };
            const Icon = cat.icon;
            return (
              <article key={item.id} id={item.id} className="scroll-mt-20 rounded-2xl target:ring-2 target:ring-brand border border-line bg-surface p-4 shadow-[var(--shadow)]">
                <div className="mb-2 flex items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold uppercase ${cat.className}`}>
                    <Icon size={12} /> {cat.label}
                  </span>
                  <time className="text-muted" title={fullDate(item.createdAt)} dateTime={new Date(item.createdAt).toISOString()}>
                    {shortAgo(item.createdAt, now)}
                  </time>
                </div>
                <h2 className="font-display text-2xl font-bold leading-tight">{item.headline}</h2>
                {item.body && <RichText text={item.body} className="mt-2 text-[15px] leading-relaxed" />}
                {item.authorName && <p className="mt-3 text-sm text-muted">By {item.authorName}</p>}
              </article>
            );
          })}
          <div ref={sentinel} className="flex h-16 items-center justify-center text-muted">
            {q.isFetchingNextPage ? <Loader2 className="animate-spin" /> : !q.hasNextPage ? "That's all the news." : null}
          </div>
        </div>
      )}
    </>
  );
}
