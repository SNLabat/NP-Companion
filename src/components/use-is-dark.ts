"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/components/providers";

/** Effective dark mode: explicit setting, else the OS preference. */
export function useIsDark() {
  const { theme } = useSettings();
  const [systemDark, setSystemDark] = useState(true);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystemDark(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return theme === "dark" || (theme === "system" && systemDark);
}
