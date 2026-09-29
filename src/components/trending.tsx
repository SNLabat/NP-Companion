"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchJson, n } from "@/lib/format";
import type { TrendingTag } from "@/lib/trending";

export function Trending({ bare }: { bare?: boolean }) {
  const { data } = useQuery({
    queryKey: ["trending"],
    queryFn: () => fetchJson<TrendingTag[]>("/api/trending"),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
  if (!data?.length) return null;

  return (
    <section className={bare ? "" : "rounded-2xl border border-line bg-surface p-3"} aria-labelledby="trending">
      <h2 id="trending" className="mb-1 px-2 font-display text-xl font-bold uppercase">
        Trending in the city
      </h2>
      <ol>
        {data.map((t, i) => (
          <li key={t.tag}>
            <Link
              href={`/social/search?q=${encodeURIComponent(`#${t.tag}`)}`}
              className="flex items-baseline gap-3 rounded-lg px-2 py-2 transition hover:bg-surface-2"
            >
              <span className="w-4 text-right text-sm text-muted">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">#{t.tag}</span>
                <span className="text-xs text-muted">
                  {t.posts} post{t.posts === 1 ? "" : "s"} · {n(t.likes) || 0} likes
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
