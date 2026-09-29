import type { Attachment, Author, NewsItem, Page, Post } from "@/lib/types";
import { type SocialSource, UpstreamError } from "./types";

/**
 * Adapter for the community "twatter reader" API
 * (https://nopixel-twatter-reader.onrender.com/social), which relays the
 * NoPixel V Companion social feed. Swap via SOCIAL_SOURCE / READER_BASE_URL.
 */

const BASE = (process.env.READER_BASE_URL || "https://nopixel-twatter-reader.onrender.com/social").replace(/\/$/, "");
const PAGE_SIZE = 25;

/* ---------- raw upstream shapes (loosely typed on purpose) ---------- */
type Raw = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

function toAuthor(raw: Raw | null | undefined, fallbackId?: string): Author {
  const r = raw ?? {};
  const id = str(r.id) ?? fallbackId ?? "unknown";
  const username = str(r.username) ?? "unknown";
  return {
    id,
    username,
    displayName: str(r.display_name) ?? username,
    avatarUrl: str(r.avatar_url),
    characterId: str(r.owner_character_id),
  };
}

function toAttachment(raw: Raw): Attachment {
  const cdn = (raw.cdn_urls ?? {}) as Raw;
  const kind = raw.kind === "image" || raw.kind === "video" ? raw.kind : "other";
  return {
    id: str(raw.id) ?? Math.random().toString(36).slice(2),
    kind,
    width: typeof raw.width === "number" ? raw.width : null,
    height: typeof raw.height === "number" ? raw.height : null,
    thumbUrl: str(cdn.feed) ?? str(raw.url),
    fullUrl: str(cdn.full) ?? str(raw.url) ?? str(cdn.feed),
  };
}

function toPost(raw: Raw): Post | null {
  const attachments = Array.isArray(raw.attachments) ? (raw.attachments as Raw[]).map(toAttachment) : [];
  const content = typeof raw.content === "string" ? raw.content : null;
  const repostOfId = str(raw.repost_of_id);
  // Null content + repost_of_id = a repost stub (resolved later).
  // Null content with nothing else = deleted/tombstoned; drop it.
  if (content === null && attachments.length === 0 && !repostOfId) return null;

  const created =
    num(raw.game_created_at) || (typeof raw.created_at === "string" ? Date.parse(raw.created_at) : 0) || Date.now();
  const id = String(raw.id);

  return {
    id,
    key: id,
    author: toAuthor(raw.author as Raw, str(raw.author_id) ?? undefined),
    content: content ?? "",
    createdAt: created,
    likeCount: num(raw.like_count),
    replyCount: num(raw.reply_count),
    repostCount: num(raw.repost_count),
    viewCount: num(raw.view_count),
    attachments,
    parentPostId: str(raw.parent_post_id),
    repostOfId,
  };
}

const isRepostStub = (p: Post) => !!p.repostOfId && !p.content && p.attachments.length === 0;

const toPosts = (arr: unknown): Post[] =>
  Array.isArray(arr) ? (arr as Raw[]).map(toPost).filter((p): p is Post => p !== null) : [];

function toPage(json: unknown): Page<Post> {
  const j = (json ?? {}) as Raw;
  const meta = (j.meta ?? {}) as Raw;
  return {
    items: toPosts(j.data),
    nextCursor: meta.hasMore ? str(meta.nextCursor) : null,
  };
}

function toNews(raw: Raw): NewsItem {
  return {
    id: String(raw.id),
    headline: str(raw.headline) ?? "",
    body: typeof raw.body === "string" ? raw.body : "",
    category: str(raw.category) ?? "news",
    authorName: str(raw.author_name),
    createdAt: num(raw.game_created_at) || Date.parse(String(raw.created_at)) || Date.now(),
  };
}

/* ---------- fetch helper: data cache + politeness ---------- */
// The reader API rate-limits per IP (about 3 req/s, 20 per 10s), and all our
// visitors share the server's IP. So: rely on caching first, cap concurrency,
// collapse identical in-flight requests, and back off on 429.
const MAX_CONCURRENT = 2;
let active = 0;
const waiters: (() => void)[] = [];
const inflight = new Map<string, Promise<unknown>>();

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((r) => waiters.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(path: string, params: Record<string, string | undefined | null>, revalidate: number) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) if (v != null && v !== "") url.searchParams.set(k, v);
  const key = url.toString();

  const existing = inflight.get(key);
  if (existing) return existing;

  const run = withSlot(async () => {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(key, {
        headers: { Accept: "application/json", "User-Agent": "nopixel-social (+github)" },
        next: { revalidate },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status === 429 && attempt < 2) {
        const reset = Number(res.headers.get("x-ratelimit-reset-short") ?? res.headers.get("retry-after") ?? 1);
        await sleep(Math.min(5, Math.max(1, reset)) * 1000 + Math.random() * 400);
        continue;
      }
      if (res.status === 404) return null;
      if (!res.ok) throw new UpstreamError(`Upstream ${res.status} for ${path}`, res.status);
      return res.json();
    }
  }).finally(() => inflight.delete(key));

  inflight.set(key, run);
  return run;
}

async function fetchByIds(ids: string[]): Promise<Post[]> {
  if (ids.length === 0) return [];
  const json = await get(
    "/feed/bookmarks",
    { limit: String(ids.length), sortType: "chronological", postIds: ids.join(",") },
    60,
  );
  return toPage(json).items.filter((p) => !isRepostStub(p));
}

/**
 * Replace repost stubs with the post they point at, marked `repostedBy`.
 * Several reposts of the same post within a page collapse into one item
 * ("A, B and 3 others reposted"). Reposts of deleted posts are dropped.
 */
async function resolveReposts(page: Page<Post>): Promise<Page<Post>> {
  const stubs = page.items.filter(isRepostStub);
  if (stubs.length === 0) return page;

  let originals = new Map<string, Post>();
  try {
    const ids = [...new Set(stubs.map((s) => s.repostOfId!))];
    originals = new Map((await fetchByIds(ids)).map((p) => [p.id, p]));
  } catch (e) {
    console.warn("[reader] repost lookup failed", e);
  }

  const out: Post[] = [];
  const groups = new Map<string, Post>();
  for (const item of page.items) {
    if (!isRepostStub(item)) {
      out.push(item);
      continue;
    }
    const orig = originals.get(item.repostOfId!);
    if (!orig) continue;
    const existing = groups.get(orig.id);
    if (existing) {
      if (!existing.repostedBy!.some((a) => a.id === item.author.id)) existing.repostedBy!.push(item.author);
      continue;
    }
    const group: Post = { ...orig, key: `rp:${item.id}`, repostedBy: [item.author], repostedAt: item.createdAt };
    groups.set(orig.id, group);
    out.push(group);
  }
  return { ...page, items: out };
}

const withoutStubs = (posts: Post[]) => posts.filter((p) => !isRepostStub(p));

export const readerSource: SocialSource = {
  name: "reader",

  async cityFeed({ sort, timeframe, cursor }) {
    const json = await get(
      "/feed/city",
      {
        limit: String(PAGE_SIZE),
        sortType: sort,
        timeframe: sort === "hottest" ? timeframe : undefined,
        after: cursor,
      },
      sort === "hottest" ? 30 : 10,
    );
    return resolveReposts(toPage(json));
  },

  async followingFeed({ userIds, sort, cursor }) {
    if (userIds.length === 0) return { items: [], nextCursor: null };
    const json = await get(
      "/feed/following",
      { limit: String(PAGE_SIZE), sortType: sort, userIds: userIds.join(","), after: cursor },
      10,
    );
    return resolveReposts(toPage(json));
  },

  async postsByIds(ids) {
    const posts = await fetchByIds(ids);
    // Preserve the caller's order (most recently bookmarked first).
    const byId = new Map(posts.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is Post => !!p);
  },

  async userByUsername(username) {
    const json = await get(`/users/by-username/${encodeURIComponent(username)}`, {}, 300);
    if (!json || typeof json !== "object" || !("id" in json)) return null;
    return toAuthor(json as Raw);
  },

  async userFeed({ userId, filter, sort, cursor }) {
    const json = await get(
      `/users/${encodeURIComponent(userId)}/feed`,
      { limit: String(PAGE_SIZE), sortType: sort, filter, after: cursor },
      15,
    );
    return resolveReposts(toPage(json));
  },

  async thread(postId) {
    const json = (await get(`/posts/${encodeURIComponent(postId)}/thread`, {}, 15)) as Raw | null;
    if (!json || !json.mainPost) return null;
    const post = toPost(json.mainPost as Raw);
    if (!post) return null;
    return {
      post,
      ancestors: withoutStubs(toPosts(json.ancestors)),
      replies: withoutStubs(toPosts(json.replies)),
    };
  },

  async replies(postId) {
    const json = await get(`/posts/${encodeURIComponent(postId)}/replies`, {}, 15);
    return withoutStubs(toPosts(Array.isArray(json) ? json : (json as Raw | null)?.data));
  },

  async searchPosts(q) {
    const json = await get("/search/tweets", { q }, 30);
    return withoutStubs(toPosts(Array.isArray(json) ? json : (json as Raw | null)?.data));
  },

  async searchUsers(q) {
    const json = await get("/search/users", { q }, 60);
    const arr = Array.isArray(json) ? json : ((json as Raw | null)?.data as unknown[]) ?? [];
    return (arr as Raw[]).map((r) => toAuthor(r));
  },

  async news(cursor) {
    const json = (await get("/news/feed", { limit: String(PAGE_SIZE), after: cursor }, 60)) as Raw | null;
    const meta = (json?.meta ?? {}) as Raw;
    return {
      items: Array.isArray(json?.data) ? (json!.data as Raw[]).map(toNews) : [],
      nextCursor: meta.hasMore ? str(meta.nextCursor) : null,
    };
  },
};
