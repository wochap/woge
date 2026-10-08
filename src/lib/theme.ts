import { useEffect, useState } from "react";

export type ThemeSetting = "auto" | "mocha" | "latte";
export type Flavour = "mocha" | "latte";

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function resolveTheme(setting: ThemeSetting, systemDark: boolean): Flavour {
  if (setting === "auto") return systemDark ? "mocha" : "latte";
  return setting;
}

function systemPrefersDark(): boolean {
  return typeof matchMedia === "function" ? matchMedia(DARK_QUERY).matches : true;
}

/** Applies `data-theme` on the root, following the system scheme live under `auto`. */
export function useTheme(setting: ThemeSetting): Flavour {
  const [dark, setDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (setting !== "auto" || typeof matchMedia !== "function") return;
    const mq = matchMedia(DARK_QUERY);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    setDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [setting]);

  const flavour = resolveTheme(setting, dark);
  useEffect(() => {
    document.documentElement.dataset.theme = flavour;
  }, [flavour]);
  return flavour;
}

export interface ThemeColors {
  accent: string;
  border: string;
  dim: string;
  bgCanvas: string;
}

export function readThemeColors(el: Element = document.documentElement): ThemeColors {
  const cs = getComputedStyle(el);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    accent: v("--accent"),
    border: v("--border"),
    dim: v("--dim"),
    bgCanvas: v("--bg-canvas"),
  };
}

/** Theme colours for Konva, re-read whenever the flavour changes. */
export function useThemeColors(flavour: Flavour): ThemeColors {
  const [colors, setColors] = useState(readThemeColors);
  useEffect(() => setColors(readThemeColors()), [flavour]);
  return colors;
}
