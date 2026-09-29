"use client";

import { useEffect, useState } from "react";

let listeners = new Set<(n: number) => void>();
let timer: ReturnType<typeof setInterval> | undefined;

/** One shared ticking clock (every 30s) for all relative timestamps. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    listeners.add(setNow);
    timer ??= setInterval(() => {
      const t = Date.now();
      listeners.forEach((l) => l(t));
    }, 30_000);
    return () => {
      listeners.delete(setNow);
      if (listeners.size === 0 && timer) {
        clearInterval(timer);
        timer = undefined;
        listeners = new Set();
      }
    };
  }, []);
  return now;
}
