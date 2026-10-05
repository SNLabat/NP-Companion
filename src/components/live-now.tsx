"use client";

import { Radio } from "lucide-react";
import Link from "next/link";
import { useLive } from "@/components/providers";
import { n } from "@/lib/format";

export function LiveNow({ limit, full }: { limit?: number; full?: boolean }) {
  const { data } = useLive();
  if (!data) return full ? <p className="p-4 text-muted">Checking Twitch…</p> : null;

  if (!data.enabled) {
    return full ? (
      <div className="p-6 text-center text-muted">
        <Radio className="mx-auto mb-2" />
        Live stream tracking isn&apos;t configured yet. Add <code>TWITCH_CLIENT_ID</code> and{" "}
        <code>TWITCH_CLIENT_SECRET</code> to enable it.
      </div>
    ) : null;
  }

  const streams = limit ? data.streams.slice(0, limit) : data.streams;
  const total = data.streams.reduce((s, x) => s + x.viewers, 0);

  const list = (
    <ul className={full ? "grid gap-3 p-4 sm:grid-cols-2" : "flex flex-col"}>
      {streams.map((s) => (
        <li key={s.login}>
          <Link
            href={`/watch?s=${s.login}`}
            title={`Watch ${s.displayName}`}
            className={
              full
                ? "block overflow-hidden rounded-xl border border-line bg-surface transition hover:border-brand"
                : "flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-surface-2"
            }
          >
            {full && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.thumbnailUrl} alt="" loading="lazy" className="aspect-video w-full object-cover" />
            )}
            <div className={full ? "p-3" : "min-w-0 flex-1"}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{s.displayName}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                  <span className="size-2 rounded-full bg-live" aria-hidden />
                  {n(s.viewers) || "0"}
                </span>
              </div>
              <p className="truncate text-sm text-muted">{s.title}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );

  if (full) {
    return streams.length ? list : <p className="p-6 text-center text-muted">Nobody&apos;s live on NoPixel right now.</p>;
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-3" aria-labelledby="live-now">
      <div className="mb-1 px-2">
        <h2 id="live-now" className="whitespace-nowrap font-display text-xl font-bold uppercase">
          Live in the city
        </h2>
        <span className="block text-xs text-muted">
          {data.streams.length} streams · {n(total)} viewers
        </span>
      </div>
      {streams.length ? list : <p className="px-2 py-3 text-sm text-muted">Nobody&apos;s live right now.</p>}
      <div className="flex justify-between px-2 pt-2 text-sm">
        {data.streams.length > (limit ?? 0) ? (
          <Link href="/live" className="text-brand hover:underline">
            See all live
          </Link>
        ) : (
          <span />
        )}
        {data.streams.length > 1 && (
          <Link
            href={`/watch?s=${data.streams.slice(0, 4).map((s) => s.login).join(",")}`}
            className="font-semibold text-brand hover:underline"
          >
            Multistream top 4
          </Link>
        )}
      </div>
    </section>
  );
}
