import { listFonts } from "./backend";
import { DEFAULT_FONT } from "../store/settings";

export const BUNDLED_FONTS = [DEFAULT_FONT, "JetBrains Mono Variable"];

let list: Promise<string[]> | null = null;

/** Installed families, fetched once; bundled only outside Tauri or on failure. */
export function fontList(): Promise<string[]> {
  list ??= listFonts().catch(() => [...BUNDLED_FONTS]);
  return list;
}

export function fontSpec(family: string, size: number, bold: boolean): string {
  return `${bold ? "bold " : ""}${size}px "${family.replace(/"/g, "")}"`;
}

const loaded = new Map<string, Promise<void>>();

/** Resolves when `family` can be drawn; `onLoaded` runs once after a real load. */
export function ensureFontLoaded(
  family: string,
  bold = false,
  onLoaded?: () => void,
): Promise<void> {
  const key = `${family}|${bold}`;
  let p = loaded.get(key);
  if (!p) {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    p = fonts?.load
      ? fonts.load(fontSpec(family, 16, bold)).then(
          () => undefined,
          () => undefined,
        )
      : Promise.resolve();
    loaded.set(key, p);
    p.then(() => onLoaded?.());
  }
  return p;
}

export function filterFonts(fonts: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  return q ? fonts.filter((f) => f.toLowerCase().includes(q)) : fonts;
}
