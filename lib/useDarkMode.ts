"use client";

import { useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";

const KEY = "pglu:theme";

function apply(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") delete root.dataset.theme;
  else root.dataset.theme = mode;
}

export function useTheme(): {
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
} {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as ThemeMode) || "system";
    setModeState(stored);
    apply(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function setMode(m: ThemeMode) {
    setModeState(m);
    if (m === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, m);
    apply(m);
  }

  const isDark = mode === "dark" || (mode === "system" && systemDark);
  return { isDark, mode, setMode };
}

/** Back-compat: resolved dark flag only. */
export function useDarkMode(): boolean {
  return useTheme().isDark;
}
