import type { Flavour } from "../lib/theme";

export type ColorKey =
  "red" | "peach" | "yellow" | "green" | "teal" | "blue" | "mauve" | "pink" | "white" | "black";

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

/** Text plate colour (`--bg-deep`) per flavour. */
export const PLATE_COLOR: Record<Flavour, string> = { mocha: "#11111b", latte: "#dce0e8" };
