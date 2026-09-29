// Normalized shapes used across the app. Every data source adapter must
// produce these, so the UI never depends on a specific upstream.

export interface Author {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  characterId: string | null;
}

export interface Attachment {
  id: string;
  kind: "image" | "video" | "other";
  width: number | null;
  height: number | null;
  thumbUrl: string | null;
  fullUrl: string | null;
}

export interface Post {
  id: string;
  /** unique list key; differs from id when this item is a repost */
  key: string;
  author: Author;
  content: string;
  createdAt: number; // epoch ms
  likeCount: number;
  replyCount: number;
  repostCount: number;
  viewCount: number;
  attachments: Attachment[];
  parentPostId: string | null;
  repostOfId: string | null;
  /** set when this feed item is someone reposting `id` */
  repostedBy?: Author[];
  repostedAt?: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface Thread {
  post: Post;
  ancestors: Post[];
  replies: Post[];
}

export interface NewsItem {
  id: string;
  headline: string;
  body: string;
  category: string;
  authorName: string | null;
  createdAt: number;
}

export type FeedSort = "chronological" | "hottest";
export type Timeframe = "24h" | "7d" | "all";
export type UserFeedFilter = "posts" | "replies" | "media";

export interface LiveStream {
  login: string;
  displayName: string;
  title: string;
  viewers: number;
  thumbnailUrl: string;
  startedAt: string;
}

export interface LiveResponse {
  enabled: boolean;
  streams: LiveStream[];
  /** lowercased Twatter username -> twitch login */
  links: Record<string, string>;
}
