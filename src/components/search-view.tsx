"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { PageHeader, Tabs } from "@/components/page-header";
import { PostList, Skeleton } from "@/components/post-list";
import { SearchBox } from "@/components/search-box";
import { Trending } from "@/components/trending";
import { fetchJson, userPath } from "@/lib/format";
import type { Author, Page, Post } from "@/lib/types";

type Tab = "posts" | "people";

export function SearchView() {
  const params = useSearchParams();
  const router = useRouter();
  const q = (params.get("q") ?? "").trim();
  const tab: Tab = params.get("tab") === "people" ? "people" : "posts";

  const setTab = (t: Tab) => {
    const sp = new URLSearchParams(params);
    if (t === "people") sp.set("tab", "people");
    else sp.delete("tab");
    router.replace(`/social/search?${sp}`, { scroll: false });
  };

  return (
    <>
      <PageHeader title="Search" subtitle={q ? `Results for "${q}"` : undefined} back>
        <div className="px-4 pb-3">
          <SearchBox autoFocus={!q} />
        </div>
        {q && (
          <Tabs
            tabs={[
              { value: "posts", label: "Posts" },
              { value: "people", label: "People" },
            ]}
            value={tab}
            onChange={setTab}
          />
        )}
      </PageHeader>

      {q.length < 2 ? (
        <div className="p-4">
          <p className="mb-4 px-2 text-muted">Search posts, #hashtags, or characters by name.</p>
          <Trending bare />
        </div>
      ) : tab === "posts" ? (
        <PostList
          key={q}
          queryKey={["search", "posts", q]}
          fetchPage={(cursor) =>
            fetchJson<Page<Post>>(`/api/search?q=${encodeURIComponent(q)}${cursor ? `&cursor=${cursor}` : ""}`)
          }
          empty={`No posts match "${q}".`}
        />
      ) : (
        <People q={q} />
      )}
    </>
  );
}

function People({ q }: { q: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["search", "people", q],
    queryFn: () => fetchJson<Page<Author>>(`/api/search?type=users&q=${encodeURIComponent(q)}`),
  });
  if (isPending) return <Skeleton rows={4} />;
  if (isError) return <p className="p-8 text-center text-muted">Search is unavailable right now.</p>;
  if (!data.items.length) return <p className="p-8 text-center text-muted">No characters match &ldquo;{q}&rdquo;.</p>;
  return (
    <ul>
      {data.items.map((u) => (
        <li key={u.id}>
          <Link href={userPath(u.username)} className="flex items-center gap-3 border-b border-line px-4 py-3 hover:bg-surface-2/50">
            <Avatar author={u} />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{u.displayName}</span>
              <span className="block truncate text-muted">@{u.username}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
