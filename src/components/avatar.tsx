"use client";

import { useState } from "react";
import type { Author } from "@/lib/types";

const PALETTE = ["#1d9bd1", "#ff487c", "#7c5cff", "#16a37f", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({
  author,
  size = 44,
  live,
}: {
  author: Pick<Author, "id" | "username" | "displayName" | "avatarUrl">;
  size?: number;
  live?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const label = (author.displayName || author.username || "?").replace(/[^\p{L}\p{N}]/gu, "");
  const initials = label.slice(0, 2).toUpperCase() || "?";
  const showImg = author.avatarUrl && !broken;

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-white ${
        live ? "ring-2 ring-live ring-offset-2 ring-offset-surface" : ""
      }`}
      style={{ width: size, height: size, background: PALETTE[hash(author.id) % PALETTE.length], fontSize: size * 0.38 }}
      aria-hidden
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote CDN webp, already sized
        <img
          src={author.avatarUrl!}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
