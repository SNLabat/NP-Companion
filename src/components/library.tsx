"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase, supabaseEnabled } from "@/lib/supabase/client";
import type { Author } from "@/lib/types";

/**
 * Follows + bookmarks. Always mirrored to localStorage so the app works
 * signed out. When Supabase is configured and the user signs in (Twitch
 * OAuth), local items are merged into their account once and every change
 * is written through to the cloud.
 */

export type FollowRef = Pick<Author, "id" | "username" | "displayName" | "avatarUrl">;

interface LibraryState {
  ready: boolean;
  follows: FollowRef[];
  bookmarks: string[]; // post ids, newest first
  isFollowing: (id: string) => boolean;
  toggleFollow: (a: FollowRef) => void;
  isBookmarked: (id: string) => boolean;
  toggleBookmark: (id: string) => void;
  exportJson: () => string;
  importJson: (json: string) => boolean;
  accountsEnabled: boolean;
  session: Session | null;
  signIn: () => void;
  signOut: () => void;
}

const LS_FOLLOWS = "nps.follows.v1";
const LS_BOOKMARKS = "nps.bookmarks.v1";

const Ctx = createContext<LibraryState | null>(null);

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked; state still lives in memory */
  }
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [follows, setFollows] = useState<FollowRef[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const syncedFor = useRef<string | null>(null);

  // Load local state on mount (server render starts empty to match).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from browser storage
    setFollows(readLS<FollowRef[]>(LS_FOLLOWS, []));
    setBookmarks(readLS<string[]>(LS_BOOKMARKS, []));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writeLS(LS_FOLLOWS, follows);
  }, [follows, ready]);
  useEffect(() => {
    if (ready) writeLS(LS_BOOKMARKS, bookmarks);
  }, [bookmarks, ready]);

  // Auth session tracking.
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // On sign-in: pull cloud rows, push local-only rows, adopt the union.
  useEffect(() => {
    const sb = supabase();
    const uid = session?.user.id;
    if (!sb || !uid || !ready || syncedFor.current === uid) return;
    syncedFor.current = uid;

    (async () => {
      const [fRes, bRes] = await Promise.all([
        sb.from("user_follows").select("author_id,username,display_name,avatar_url").order("created_at"),
        sb.from("user_bookmarks").select("post_id,created_at").order("created_at", { ascending: false }),
      ]);
      if (fRes.error || bRes.error) {
        console.error("[sync]", fRes.error ?? bRes.error);
        return;
      }
      const cloudF: FollowRef[] = fRes.data.map((r) => ({
        id: r.author_id,
        username: r.username ?? "",
        displayName: r.display_name ?? r.username ?? "",
        avatarUrl: r.avatar_url,
      }));
      const cloudB: string[] = bRes.data.map((r) => r.post_id);

      const cloudFIds = new Set(cloudF.map((f) => f.id));
      const cloudBIds = new Set(cloudB);
      const localOnlyF = follows.filter((f) => !cloudFIds.has(f.id));
      const localOnlyB = bookmarks.filter((id) => !cloudBIds.has(id));

      if (localOnlyF.length) {
        await sb.from("user_follows").upsert(
          localOnlyF.map((f) => ({
            user_id: uid,
            author_id: f.id,
            username: f.username || null,
            display_name: f.displayName || null,
            avatar_url: f.avatarUrl,
          })),
        );
      }
      if (localOnlyB.length) {
        await sb.from("user_bookmarks").upsert(localOnlyB.map((post_id) => ({ user_id: uid, post_id })));
      }
      setFollows([...cloudF, ...localOnlyF]);
      setBookmarks([...localOnlyB, ...cloudB]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per signed-in user
  }, [session, ready]);

  const followIds = useMemo(() => new Set(follows.map((f) => f.id)), [follows]);
  const bookmarkIds = useMemo(() => new Set(bookmarks), [bookmarks]);

  const toggleFollow = useCallback(
    (a: FollowRef) => {
      const sb = supabase();
      const uid = session?.user.id;
      if (followIds.has(a.id)) {
        setFollows((prev) => prev.filter((f) => f.id !== a.id));
        if (sb && uid) sb.from("user_follows").delete().match({ user_id: uid, author_id: a.id }).then();
      } else {
        setFollows((prev) => [...prev, a]);
        if (sb && uid)
          sb.from("user_follows")
            .upsert({
              user_id: uid,
              author_id: a.id,
              username: a.username,
              display_name: a.displayName,
              avatar_url: a.avatarUrl,
            })
            .then();
      }
    },
    [followIds, session],
  );

  const toggleBookmark = useCallback(
    (id: string) => {
      const sb = supabase();
      const uid = session?.user.id;
      if (bookmarkIds.has(id)) {
        setBookmarks((prev) => prev.filter((b) => b !== id));
        if (sb && uid) sb.from("user_bookmarks").delete().match({ user_id: uid, post_id: id }).then();
      } else {
        setBookmarks((prev) => [id, ...prev]);
        if (sb && uid) sb.from("user_bookmarks").upsert({ user_id: uid, post_id: id }).then();
      }
    },
    [bookmarkIds, session],
  );

  const exportJson = useCallback(
    () => JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), follows, bookmarks }, null, 2),
    [follows, bookmarks],
  );

  const importJson = useCallback(
    (json: string) => {
      try {
        const data = JSON.parse(json) as { follows?: FollowRef[]; bookmarks?: string[] };
        const f = (data.follows ?? []).filter((x) => x && typeof x.id === "string");
        const b = (data.bookmarks ?? []).filter((x) => typeof x === "string");
        f.filter((x) => !followIds.has(x.id)).forEach((x) => toggleFollow(x));
        b.filter((x) => !bookmarkIds.has(x))
          .reverse()
          .forEach((x) => toggleBookmark(x));
        return true;
      } catch {
        return false;
      }
    },
    [followIds, bookmarkIds, toggleFollow, toggleBookmark],
  );

  const signIn = useCallback(() => {
    const sb = supabase();
    if (!sb) return;
    const next = window.location.pathname + window.location.search;
    sb.auth.signInWithOAuth({
      provider: "twitch",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }, []);

  const signOut = useCallback(() => {
    supabase()?.auth.signOut();
    syncedFor.current = null;
    setSession(null);
  }, []);

  const value: LibraryState = {
    ready,
    follows,
    bookmarks,
    isFollowing: (id) => followIds.has(id),
    toggleFollow,
    isBookmarked: (id) => bookmarkIds.has(id),
    toggleBookmark,
    exportJson,
    importJson,
    accountsEnabled: supabaseEnabled,
    session,
    signIn,
    signOut,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLibrary() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLibrary must be used inside LibraryProvider");
  return v;
}
