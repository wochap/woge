import type { Flavour } from "../lib/theme";

export type ColorKey =
  | "red"
  | "peach"
  | "yellow"
  | "green"
  | "teal"
  | "blue"
  | "mauve"
  | "pink"
  | "white"
  | "black";

/** Swatch order in the options strip (design board 1i). */
export const SWATCHES: ColorKey[] = [
  "red",
  "peach",
  "yellow",
  "green",
  "teal",
  "blue",
  "mauve",
  "pink",
  "white",
  "black",
];

/** `--ann-*` values per flavour; mirrors `styles.css`. */
export const PALETTE: Record<Flavour, Record<ColorKey, string>> = {
  mocha: {
    red: "#f38ba8",
    peach: "#fab387",
    yellow: "#f9e2af",
    green: "#a6e3a1",
    teal: "#94e2d5",
    blue: "#89b4fa",
    mauve: "#cba6f7",
    pink: "#f5c2e7",
    white: "#eff1f5",
    black: "#11111b",
  },
  latte: {
    red: "#d20f39",
    peach: "#fe640b",
    yellow: "#df8e1d",
    green: "#40a02b",
    teal: "#179299",
    blue: "#1e66f5",
    mauve: "#8839ef",
    pink: "#ea76cb",
    white: "#eff1f5",
    black: "#11111b",
  },
};

/** Swatches that need a rim to stand out on the strip background. */
export function needsRim(key: ColorKey, flavour: Flavour): boolean {
  return flavour === "mocha" ? key === "black" : key === "white";
}

export function isColorKey(v: unknown): v is ColorKey {
  return typeof v === "string" && (SWATCHES as string[]).includes(v);
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** `black` or `white`, whichever contrasts more with `key` in `flavour` (fill/plate auto-pick). */
export function contrastKey(key: ColorKey, flavour: Flavour): ColorKey {
  const c = PALETTE[flavour][key] ?? PALETTE[flavour].red;
  return contrast(c, PALETTE[flavour].black) >= contrast(c, PALETTE[flavour].white)
    ? "black"
    : "white";
}

/** Display names for tooltips. */
export const COLOR_NAMES: Record<ColorKey, string> = {
  red: "Red",
  peach: "Peach",
  yellow: "Yellow",
  green: "Green",
  teal: "Teal",
  blue: "Blue",
  mauve: "Mauve",
  pink: "Pink",
  white: "White",
  black: "Black",
};

/** Digit key that picks a swatch: 1…9, 0. */
export function swatchDigit(key: ColorKey): string {
  return String((SWATCHES.indexOf(key) + 1) % 10);
}
