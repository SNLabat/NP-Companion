"use client";

import { Bookmark, Eye, Heart, Link2, MessageCircle, Repeat2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { useLibrary } from "@/components/library";
import { LiveBadge } from "@/components/live-badge";
import { Media } from "@/components/media";
import { useLive } from "@/components/providers";
import { RichText } from "@/components/rich-text";
import { useNow } from "@/components/use-now";
import { fullDate, n, postPath, shortAgo, userPath } from "@/lib/format";
import type { Post } from "@/lib/types";

export function PostCard({
  post,
  variant = "feed",
  threadLine,
  inThread,
}: {
  post: Post;
  variant?: "feed" | "focus";
  /** rendered inside a thread page, so reply context is implied */
  inThread?: boolean;
  /** draw a connector to the next post (thread ancestors) */
  threadLine?: boolean;
}) {
  const router = useRouter();
  const now = useNow();
  const { streamFor } = useLive();
  const stream = streamFor(post.author.username);
  const focus = variant === "focus";

  const open = () => {
    if (focus) return;
    if (window.getSelection()?.toString()) return; // let people select text
    router.push(postPath(post.id));
  };

  return (
    <article
      onClick={open}
      className={`relative px-4 ${focus ? "pt-4" : "cursor-pointer py-3 transition-colors hover:bg-surface-2/50"} ${
        threadLine ? "" : "border-b border-line"
      }`}
    >
      {post.repostedBy && post.repostedBy.length > 0 && <RepostLine by={post.repostedBy} at={post.repostedAt} now={now} />}
      <div className="flex gap-3">
        <div className="relative flex flex-col items-center">
          <Link href={userPath(post.author.username)} onClick={(e) => e.stopPropagation()} aria-label={`${post.author.displayName}'s profile`}>
            <Avatar author={post.author} live={!!stream} />
          </Link>
          {threadLine && <span className="mt-1 w-0.5 flex-1 bg-line" aria-hidden />}
        </div>

        <div className="min-w-0 flex-1">
          <header className="flex min-w-0 items-center gap-1.5 text-[15px] leading-5">
            <Link
              href={userPath(post.author.username)}
              onClick={(e) => e.stopPropagation()}
              className="truncate font-semibold hover:underline"
            >
              {post.author.displayName}
            </Link>
            {stream && <LiveBadge stream={stream} />}
            <span className="truncate text-muted">@{post.author.username}</span>
            {!focus && (
              <>
                <span className="text-muted" aria-hidden>
                  ·
                </span>
                <time dateTime={new Date(post.createdAt).toISOString()} title={fullDate(post.createdAt)} className="shrink-0 text-muted">
                  {shortAgo(post.createdAt, now)}
                </time>
              </>
            )}
          </header>

          {post.parentPostId && !focus && !inThread && (
            <p className="text-sm text-muted">Replying in a thread</p>
          )}

          {post.content && <RichText text={post.content} className={focus ? "mt-3 text-[19px] leading-7" : "mt-0.5 text-[15px] leading-[1.4]"} />}
          <Media items={post.attachments} />

          {focus && (
            <p className="mt-4 border-b border-line pb-3 text-[15px] text-muted">
              <time dateTime={new Date(post.createdAt).toISOString()}>{fullDate(post.createdAt)}</time>
              {post.viewCount > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-ink">{n(post.viewCount)}</span> views
                </>
              )}
            </p>
          )}

          <Actions post={post} focus={focus} />
        </div>
      </div>
    </article>
  );
}

function Actions({ post, focus }: { post: Post; focus: boolean }) {
  const { isBookmarked, toggleBookmark } = useLibrary();
  const [copied, setCopied] = useState(false);
  const saved = isBookmarked(post.id);

  const share = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${postPath(post.id)}`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ url, text: `${post.author.displayName} on Twatter` });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {}
  };

  const stat = "flex items-center gap-1.5 text-[13px] text-muted";
  return (
    <div className={`mt-2 flex items-center justify-between ${focus ? "border-b border-line py-2" : "max-w-[440px]"}`}>
      <span className={stat} title={`${post.replyCount} replies`}>
        <MessageCircle size={17} aria-hidden />
        <span className="min-w-4">{n(post.replyCount)}</span>
        <span className="sr-only">replies</span>
      </span>
      <span className={stat} title={`${post.repostCount} reposts`}>
        <Repeat2 size={18} aria-hidden />
        <span className="min-w-4">{n(post.repostCount)}</span>
        <span className="sr-only">reposts</span>
      </span>
      <span className={stat} title={`${post.likeCount} likes`}>
        <Heart size={17} aria-hidden />
        <span className="min-w-4">{n(post.likeCount)}</span>
        <span className="sr-only">likes</span>
      </span>
      {!focus && (
        <span className={`${stat} max-sm:hidden`} title={`${post.viewCount} views`}>
          <Eye size={17} aria-hidden />
          <span className="min-w-4">{n(post.viewCount)}</span>
          <span className="sr-only">views</span>
        </span>
      )}
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark(post.id);
          }}
          aria-pressed={saved}
          aria-label={saved ? "Remove bookmark" : "Bookmark"}
          className={`rounded-full p-1.5 transition-colors hover:bg-brand-soft hover:text-brand ${saved ? "text-brand" : "text-muted"}`}
        >
          <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          onClick={share}
          aria-label="Copy link to post"
          className="relative rounded-full p-1.5 text-muted transition-colors hover:bg-brand-soft hover:text-brand"
        >
          <Link2 size={17} />
          {copied && (
            <span role="status" className="absolute -top-7 right-0 whitespace-nowrap rounded bg-ink px-2 py-0.5 text-xs text-bg">
              Link copied
            </span>
          )}
        </button>
      </span>
    </div>
  );
}

function RepostLine({ by, at, now }: { by: Post["repostedBy"] & object; at?: number; now: number }) {
  const [first, second] = by;
  const others = by.length - 2;
  const name = (a: (typeof by)[number]) => (
    <Link href={userPath(a.username)} onClick={(e) => e.stopPropagation()} className="font-semibold hover:underline">
      {a.displayName}
    </Link>
  );
  return (
    <p className="mb-1 ml-8 flex items-center gap-2 text-[13px] text-muted">
      <Repeat2 size={15} aria-hidden className="shrink-0" />
      <span className="truncate">
        {name(first)}
        {second && (others > 0 ? ", " : " and ")}
        {second && name(second)}
        {others > 0 && ` and ${others} other${others === 1 ? "" : "s"}`} reposted
        {at ? ` · ${shortAgo(at, now)}` : ""}
      </span>
    </p>
  );
}
