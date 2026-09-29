"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { PostCard } from "@/components/post-card";
import { Skeleton } from "@/components/post-list";
import { fetchJson } from "@/lib/format";
import type { Thread } from "@/lib/types";

export function ThreadView({ id, initialThread }: { id: string; initialThread: Thread | null }) {
  const { data, isError, refetch } = useQuery({
    queryKey: ["thread", id],
    queryFn: () => fetchJson<Thread>(`/api/posts/${id}`),
    initialData: initialThread ?? undefined,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  // Keep the focused post in view when there are ancestors above it.
  const focusRef = useRef<HTMLDivElement>(null);
  const hasAncestors = (data?.ancestors.length ?? 0) > 0;
  useEffect(() => {
    if (hasAncestors) focusRef.current?.scrollIntoView({ block: "start" });
  }, [id, hasAncestors]);

  return (
    <>
      <PageHeader title="Post" back />
      {isError && !data ? (
        <div className="p-8 text-center text-muted">
          Couldn&apos;t load this post.{" "}
          <button type="button" onClick={() => refetch()} className="text-brand underline">
            Retry
          </button>
        </div>
      ) : !data ? (
        <Skeleton rows={3} />
      ) : (
        <>
          {data.ancestors.map((p) => (
            <PostCard key={p.id} post={p} threadLine inThread />
          ))}
          <div ref={focusRef} className="scroll-mt-16">
            <PostCard post={data.post} variant="focus" />
          </div>
          {data.replies.length === 0 ? (
            <p className="p-8 text-center text-muted">{data.post.replyCount > 0 ? "Replies are loading…" : "No replies yet."}</p>
          ) : (
            data.replies.map((p) => <PostCard key={p.id} post={p} inThread />)
          )}
          {/* let the focused post reach the top even in short threads */}
          {hasAncestors && <div className="h-[60vh]" aria-hidden />}
        </>
      )}
    </>
  );
}
