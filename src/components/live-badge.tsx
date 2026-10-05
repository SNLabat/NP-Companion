"use client";

import Link from "next/link";
import type { LiveStream } from "@/lib/types";

export function LiveBadge({ stream }: { stream: LiveStream }) {
  return (
    <Link
      href={`/watch?s=${stream.login}`}
      onClick={(e) => e.stopPropagation()}
      title={`${stream.displayName} is live: ${stream.title}. Click to watch.`}
      className="inline-flex shrink-0 items-center gap-1 rounded bg-live px-1.5 py-px text-[11px] font-bold uppercase tracking-wide text-white hover:brightness-110"
    >
      <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />
      Live
    </Link>
  );
}
