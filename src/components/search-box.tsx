"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBox({ autoFocus }: { autoFocus?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [lastUrlQ, setLastUrlQ] = useState(urlQ);
  // Follow the URL when it changes (e.g. clicking a #hashtag), per React's
  // "adjusting state when a prop changes" pattern.
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ);
    setQ(urlQ);
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        if (v.length >= 2) {
          const tab = params.get("tab");
          router.push(`/social/search?q=${encodeURIComponent(v)}${tab === "people" ? "&tab=people" : ""}`);
        }
      }}
      className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-4 py-2.5 focus-within:border-brand focus-within:bg-surface"
    >
      <Search size={18} className="text-muted" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search posts, #tags, people"
        aria-label="Search"
        autoFocus={autoFocus}
        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
      />
    </form>
  );
}
