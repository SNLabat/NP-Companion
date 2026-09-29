"use client";

import Link from "next/link";
import { Fragment } from "react";
import { userPath } from "@/lib/format";

const TOKEN_RE = /(https?:\/\/[^\s]+|#[\p{L}\p{N}_]+|@[A-Za-z0-9_]{2,32})/gu;

/** Post text with #hashtags -> search, @mentions -> profile, URLs -> links. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(TOKEN_RE);
  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const stop = (e: React.MouseEvent) => e.stopPropagation();
        if (part.startsWith("#"))
          return (
            <Link key={i} href={`/social/search?q=${encodeURIComponent(part)}`} onClick={stop} className="text-brand hover:underline">
              {part}
            </Link>
          );
        if (part.startsWith("@"))
          return (
            <Link key={i} href={userPath(part.slice(1))} onClick={stop} className="text-brand hover:underline">
              {part}
            </Link>
          );
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow ugc" onClick={stop} className="text-brand hover:underline">
            {part.replace(/^https?:\/\//, "").slice(0, 40)}
            {part.length > 48 ? "…" : ""}
          </a>
        );
      })}
    </p>
  );
}
