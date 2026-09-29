"use client";

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LibraryProvider } from "@/components/library";
import type { LiveResponse, LiveStream } from "@/lib/types";

/* ---------------- settings (theme + auto refresh) ---------------- */

export type Theme = "system" | "light" | "dark";

interface Settings {
  theme: Theme;
  setTheme: (t: Theme) => void;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
}

const SettingsCtx = createContext<Settings | null>(null);

function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [autoRefresh, setAutoRefreshState] = useState(true);

  // Hydrate from localStorage after mount (server render uses defaults).
  useEffect(() => {
    try {
      const t = localStorage.getItem("nps.theme") as Theme | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from browser storage
      if (t === "light" || t === "dark") setThemeState(t);
      if (localStorage.getItem("nps.autoRefresh") === "0") setAutoRefreshState(false);
    } catch {}
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    const el = document.documentElement;
    if (t === "system") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", t);
    try {
      if (t === "system") localStorage.removeItem("nps.theme");
      else localStorage.setItem("nps.theme", t);
    } catch {}
  }, []);

  const setAutoRefresh = useCallback((v: boolean) => {
    setAutoRefreshState(v);
    try {
      localStorage.setItem("nps.autoRefresh", v ? "1" : "0");
    } catch {}
  }, []);

  return (
    <SettingsCtx.Provider value={{ theme, setTheme, autoRefresh, setAutoRefresh }}>{children}</SettingsCtx.Provider>
  );
}

export function useSettings() {
  const v = useContext(SettingsCtx);
  if (!v) throw new Error("useSettings outside provider");
  return v;
}

/* ---------------- live streams ---------------- */

const LiveCtx = createContext<{ data: LiveResponse | undefined; streamFor: (username: string) => LiveStream | null }>({
  data: undefined,
  streamFor: () => null,
});

function LiveProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery<LiveResponse>({
    queryKey: ["live"],
    queryFn: () => fetch("/api/live").then((r) => r.json()),
    refetchInterval: 90_000,
    staleTime: 60_000,
  });

  const streamFor = useCallback(
    (username: string) => {
      if (!data?.enabled) return null;
      const login = data.links[username.toLowerCase()];
      if (!login) return null;
      return data.streams.find((s) => s.login === login) ?? null;
    },
    [data],
  );

  return <LiveCtx.Provider value={{ data, streamFor }}>{children}</LiveCtx.Provider>;
}

export const useLive = () => useContext(LiveCtx);

/* ---------------- root ---------------- */

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 2 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <SettingsProvider>
        <LibraryProvider>
          <LiveProvider>{children}</LiveProvider>
        </LibraryProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}
