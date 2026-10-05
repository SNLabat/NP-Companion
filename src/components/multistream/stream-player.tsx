"use client";

import { useEffect, useRef, useState } from "react";
import type { Pov } from "@/lib/multistream";

/* ---------- Twitch Embed Player API (player.twitch.tv/js/embed/v1.js) ---------- */

interface TwitchPlayer {
  setMuted(muted: boolean): void;
  getMuted(): boolean;
  setVolume(v: number): void;
  play(): void;
  addEventListener(event: string, cb: () => void): void;
}
interface TwitchNS {
  Player: {
    new (el: HTMLElement | string, opts: Record<string, unknown>): TwitchPlayer;
    READY: string;
    PLAYING: string;
  };
}
declare global {
  interface Window {
    Twitch?: TwitchNS;
  }
}

let loader: Promise<TwitchNS> | null = null;
function loadTwitch(): Promise<TwitchNS> {
  if (window.Twitch?.Player) return Promise.resolve(window.Twitch);
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://player.twitch.tv/js/embed/v1.js";
    s.async = true;
    s.onload = () => (window.Twitch ? resolve(window.Twitch) : reject(new Error("Twitch API missing")));
    s.onerror = () => {
      loader = null;
      reject(new Error("Twitch player failed to load"));
    };
    document.head.appendChild(s);
  });
  return loader;
}

/**
 * One stream player. It is mounted once per POV and never re-created when
 * the layout changes (the parent only moves it), so streams don't reload.
 */
export function StreamPlayer({ pov, muted }: { pov: Pov; muted: boolean }) {
  if (pov.platform === "kick") return <KickPlayer channel={pov.channel} muted={muted} />;
  return <TwitchStream channel={pov.channel} muted={muted} />;
}

function TwitchStream({ channel, muted }: { channel: string; muted: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<TwitchPlayer | null>(null);
  const mutedRef = useRef(muted);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    mutedRef.current = muted;
    player.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    let cancelled = false;
    const el = host.current;
    loadTwitch()
      .then((T) => {
        if (cancelled || !el) return;
        el.replaceChildren();
        const p = new T.Player(el, {
          channel,
          parent: [window.location.hostname],
          width: "100%",
          height: "100%",
          autoplay: true,
          muted: mutedRef.current,
        });
        p.addEventListener(T.Player.READY, () => p.setMuted(mutedRef.current));
        player.current = p;
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      player.current = null;
      el?.replaceChildren();
    };
  }, [channel]);

  if (failed) {
    // Script blocked (ad/tracker blockers): fall back to a plain iframe.
    return (
      <iframe
        title={`${channel} on Twitch`}
        src={`https://player.twitch.tv/?channel=${channel}&parent=${typeof window === "undefined" ? "" : window.location.hostname}&autoplay=true&muted=${muted}`}
        allow="autoplay; fullscreen"
        allowFullScreen
        className="size-full border-0"
      />
    );
  }
  return <div ref={host} className="size-full [&>iframe]:size-full" />;
}

function KickPlayer({ channel, muted }: { channel: string; muted: boolean }) {
  // Kick's embed has no JS API, so audio changes reload the player.
  return (
    <iframe
      key={String(muted)}
      title={`${channel} on Kick`}
      src={`https://player.kick.com/${channel}?autoplay=true&muted=${muted}`}
      allow="autoplay; fullscreen"
      allowFullScreen
      className="size-full border-0"
    />
  );
}

export function chatSrc(pov: Pov, dark: boolean): string {
  if (pov.platform === "kick") return `https://kick.com/popout/${pov.channel}/chat`;
  const host = typeof window === "undefined" ? "localhost" : window.location.hostname;
  return `https://www.twitch.tv/embed/${pov.channel}/chat?parent=${host}${dark ? "&darkpopout" : ""}`;
}
