"use client";

import { Bell, Bookmark, Home, Newspaper, Radio, Search, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LiveNow } from "@/components/live-now";
import { SearchBox } from "@/components/search-box";
import { Trending } from "@/components/trending";
import { SITE_NAME } from "@/lib/site";

type NavItem = { href: string; label: string; icon: typeof Home; match: (p: string, tab: string | null) => boolean };

const NAV: NavItem[] = [
  { href: "/social", label: "City", icon: Home, match: (p, t) => p === "/social" && !t },
  { href: "/social?tab=following", label: "Following", icon: Users, match: (p, t) => p === "/social" && t === "following" },
  { href: "/social?tab=bookmarks", label: "Bookmarks", icon: Bookmark, match: (p, t) => p === "/social" && t === "bookmarks" },
  { href: "/news", label: "News", icon: Newspaper, match: (p) => p.startsWith("/news") },
  { href: "/live", label: "Live", icon: Radio, match: (p) => p.startsWith("/live") },
  { href: "/social/search", label: "Search", icon: Search, match: (p) => p.startsWith("/social/search") },
  { href: "/settings", label: "Settings", icon: Settings, match: (p) => p.startsWith("/settings") },
];

const MOBILE = ["City", "Following", "News", "Live", "Search"];

function Nav({ mobile }: { mobile?: boolean }) {
  const pathname = usePathname();
  const tab = useSearchParams().get("tab");
  const items = mobile ? NAV.filter((n) => MOBILE.includes(n.label)) : NAV;

  return (
    <>
      {items.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname, tab);
        return mobile ? (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-brand" : "text-muted"}`}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
            {label}
          </Link>
        ) : (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-4 rounded-full px-4 py-2.5 text-[17px] transition-colors hover:bg-surface-2 ${
              active ? "font-semibold text-ink" : "text-muted"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 1.8} className={active ? "text-brand" : ""} />
            {label}
          </Link>
        );
      })}
    </>
  );
}

function Logo() {
  return (
    <Link href="/social" className="flex items-center gap-2 px-4 py-2">
      <span className="grid size-9 place-items-center rounded-xl bg-brand text-white">
        <Bell size={18} strokeWidth={2.4} />
      </span>
      <span className="font-display text-2xl font-extrabold uppercase italic tracking-tight">{SITE_NAME}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1280px]">
      {/* left rail */}
      <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col gap-1 px-3 py-4 md:flex">
        <Logo />
        <nav className="mt-2 flex flex-col gap-1" aria-label="Main">
          <Suspense>
            <Nav />
          </Suspense>
        </nav>
        <p className="mt-auto px-4 text-xs leading-relaxed text-muted">
          Unofficial fan project. Not affiliated with NoPixel. Content belongs to its in-game authors.
        </p>
      </aside>

      {/* main column */}
      <main className="min-w-0 flex-1 border-line pb-20 md:border-x md:pb-0 lg:max-w-[640px]">{children}</main>

      {/* right rail */}
      <aside className="sticky top-0 hidden h-dvh w-[340px] shrink-0 flex-col gap-4 overflow-y-auto px-5 py-4 lg:flex no-scrollbar">
        <Suspense>
          <SearchBox />
        </Suspense>
        <LiveNow limit={8} />
        <Trending />
      </aside>

      {/* mobile bottom bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <Suspense>
          <Nav mobile />
        </Suspense>
      </nav>
    </div>
  );
}
