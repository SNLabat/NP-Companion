import type {
  Author,
  FeedSort,
  NewsItem,
  Page,
  Post,
  Thread,
  Timeframe,
  UserFeedFilter,
} from "@/lib/types";

/**
 * A SocialSource is anything that can answer these questions about the
 * in-game social feed. Today that's the community "reader" API; later it
 * can be a direct Companion ingest backed by our own database. The UI and
 * API routes only ever talk to this interface.
 */
export interface SocialSource {
  name: string;
  cityFeed(opts: { sort: FeedSort; timeframe: Timeframe; cursor?: string | null }): Promise<Page<Post>>;
  followingFeed(opts: { userIds: string[]; sort: FeedSort; cursor?: string | null }): Promise<Page<Post>>;
  postsByIds(ids: string[]): Promise<Post[]>;
  userByUsername(username: string): Promise<Author | null>;
  userFeed(opts: {
    userId: string;
    filter: UserFeedFilter;
    sort: FeedSort;
    cursor?: string | null;
  }): Promise<Page<Post>>;
  thread(postId: string): Promise<Thread | null>;
  replies(postId: string): Promise<Post[]>;
  searchPosts(q: string): Promise<Post[]>;
  searchUsers(q: string): Promise<Author[]>;
  news(cursor?: string | null): Promise<Page<NewsItem>>;
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
