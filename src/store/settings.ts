import { create } from "zustand";
import { readState, writeState, type ConfigDefaults } from "../lib/backend";
import { contrastKey, isColorKey, type ColorKey } from "../model/palette";
import {
  DEFAULT_FILL_OPACITY,
  DEFAULT_HIGHLIGHT_OPACITY,
  DEFAULT_PLATE_OPACITY,
  PIXELATE_RANGE,
  clampOpacity,
  clampStrength,
  clampTextSize,
  type ArrowHeads,
  type BadgeSize,
  type ObjectType,
  type RedactMode,
  type StrokeWidth,
} from "../model/objects";

export const DEFAULT_FONT = "Inter Variable";
export const RECENT_FONTS = 5;
export const WRITE_DELAY = 500;
export const STATE_VERSION = 1;

export interface ShapeSettings {
  stroke: ColorKey;
  strokeOpacity: number;
  strokeWidth: StrokeWidth;
  fill: ColorKey | null;
  fillOpacity: number;
}
export interface ArrowSettings {
  stroke: ColorKey;
  strokeOpacity: number;
  strokeWidth: StrokeWidth;
  heads: ArrowHeads;
}
export interface TextSettings {
  color: ColorKey;
  colorOpacity: number;
  font: string;
  size: number;
  bold: boolean;
  plate: ColorKey | null;
  plateOpacity: number;
}

export interface BrushSettings {
  stroke: ColorKey;
  strokeOpacity: number;
  strokeWidth: StrokeWidth;
  smooth: boolean;
}
export interface HighlightSettings {
  stroke: ColorKey;
  strokeOpacity: number;
  strokeWidth: StrokeWidth;
}
export interface RedactSettings {
  mode: RedactMode;
  strength: number;
}
export interface BadgeSettings {
  color: ColorKey;
  size: BadgeSize;
}

export interface ToolSettings {
  rect: ShapeSettings;
  ellipse: ShapeSettings;
  arrow: ArrowSettings;
  text: TextSettings;
  brush: BrushSettings;
  highlight: HighlightSettings;
  redact: RedactSettings;
  badge: BadgeSettings;
}

export type SettingsPatch = Partial<
  ShapeSettings &
    ArrowSettings &
    Omit<TextSettings, "size"> &
    BrushSettings &
    RedactSettings & {
      /** Text: font size; badge: S/M/L. */
      size: number | BadgeSize;
    }
>;

const shape = (): ShapeSettings => ({
  stroke: "red",
  strokeOpacity: 1,
  strokeWidth: "M",
  fill: null,
  fillOpacity: DEFAULT_FILL_OPACITY,
});

export function builtInDefaults(): ToolSettings {
  return {
    rect: shape(),
    ellipse: shape(),
    arrow: { stroke: "red", strokeOpacity: 1, strokeWidth: "M", heads: "end" },
    text: {
      color: "red",
      colorOpacity: 1,
      font: DEFAULT_FONT,
      size: 24,
      bold: false,
      plate: null,
      plateOpacity: DEFAULT_PLATE_OPACITY,
    },
    brush: { stroke: "red", strokeOpacity: 1, strokeWidth: "M", smooth: true },
    highlight: { stroke: "yellow", strokeOpacity: DEFAULT_HIGHLIGHT_OPACITY, strokeWidth: "M" },
    redact: { mode: "pixelate", strength: PIXELATE_RANGE.default },
    badge: { color: "mauve", size: "M" },
  };
}

const isWidth = (v: unknown): v is StrokeWidth => v === "S" || v === "M" || v === "L";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Config `[defaults]` over built-ins. */
export function seedFromConfig(d: ConfigDefaults | undefined): ToolSettings {
  const t = builtInDefaults();
  if (!d) return t;
  if (isColorKey(d.color)) {
    t.rect.stroke = t.ellipse.stroke = t.arrow.stroke = d.color;
    t.text.color = t.brush.stroke = d.color;
  }
  if (isWidth(d.stroke))
    t.rect.strokeWidth =
      t.ellipse.strokeWidth =
      t.arrow.strokeWidth =
      t.brush.strokeWidth =
        d.stroke;
  if (d.font) t.text.font = d.font;
  if (typeof d.font_size === "number") t.text.size = clampTextSize(d.font_size);
  return t;
}

/** Valid fields from a state file over `base`; anything malformed is skipped. */
export function mergeState(
  base: ToolSettings,
  raw: unknown,
): { tools: ToolSettings; recentFonts: string[] } {
  const tools = structuredClone(base);
  let recentFonts: string[] = [];
  if (!raw || typeof raw !== "object" || (raw as { version?: unknown }).version !== STATE_VERSION)
    return { tools, recentFonts };
  const r = raw as { tools?: Record<string, Record<string, unknown>>; recentFonts?: unknown };
  const src = r.tools ?? {};
  for (const k of ["rect", "ellipse"] as const) {
    const s = src[k];
    if (!s || typeof s !== "object") continue;
    if (isColorKey(s.stroke)) tools[k].stroke = s.stroke;
    if (isWidth(s.strokeWidth)) tools[k].strokeWidth = s.strokeWidth;
    if (isNum(s.strokeOpacity)) tools[k].strokeOpacity = clampOpacity(s.strokeOpacity);
    if (isNum(s.fillOpacity)) tools[k].fillOpacity = clampOpacity(s.fillOpacity);
    if (s.fill === null || isColorKey(s.fill)) tools[k].fill = s.fill;
    else if (s.fill === false) tools[k].fill = null;
    else if (s.fill === true) {
      // Legacy toggle: the border colour at the old fixed 25%.
      tools[k].fill = tools[k].stroke;
      tools[k].fillOpacity = DEFAULT_FILL_OPACITY;
    }
  }
  const a = src.arrow;
  if (a && typeof a === "object") {
    if (isColorKey(a.stroke)) tools.arrow.stroke = a.stroke;
    if (isWidth(a.strokeWidth)) tools.arrow.strokeWidth = a.strokeWidth;
    if (isNum(a.strokeOpacity)) tools.arrow.strokeOpacity = clampOpacity(a.strokeOpacity);
    if (a.heads === "end" || a.heads === "both") tools.arrow.heads = a.heads;
  }
  const t = src.text;
  if (t && typeof t === "object") {
    if (isColorKey(t.color)) tools.text.color = t.color;
    if (typeof t.font === "string" && t.font) tools.text.font = t.font;
    if (typeof t.size === "number") tools.text.size = clampTextSize(t.size);
    if (typeof t.bold === "boolean") tools.text.bold = t.bold;
    if (isNum(t.colorOpacity)) tools.text.colorOpacity = clampOpacity(t.colorOpacity);
    if (isNum(t.plateOpacity)) tools.text.plateOpacity = clampOpacity(t.plateOpacity);
    if (t.plate === null || isColorKey(t.plate)) tools.text.plate = t.plate;
    else if (t.plate === false) tools.text.plate = null;
    else if (t.plate === true) {
      // Legacy toggle: auto-contrast plate at the old 70%.
      tools.text.plate = contrastKey(tools.text.color, "mocha");
      tools.text.plateOpacity = DEFAULT_PLATE_OPACITY;
    }
  }
  const b = src.brush;
  if (b && typeof b === "object") {
    if (isColorKey(b.stroke)) tools.brush.stroke = b.stroke;
    if (isWidth(b.strokeWidth)) tools.brush.strokeWidth = b.strokeWidth;
    if (isNum(b.strokeOpacity)) tools.brush.strokeOpacity = clampOpacity(b.strokeOpacity);
    if (typeof b.smooth === "boolean") tools.brush.smooth = b.smooth;
  }
  const h = src.highlight;
  if (h && typeof h === "object") {
    if (isColorKey(h.stroke)) tools.highlight.stroke = h.stroke;
    if (isWidth(h.strokeWidth)) tools.highlight.strokeWidth = h.strokeWidth;
    if (isNum(h.strokeOpacity)) tools.highlight.strokeOpacity = clampOpacity(h.strokeOpacity);
  }
  const x = src.redact;
  if (x && typeof x === "object") {
    if (x.mode === "pixelate" || x.mode === "blur") tools.redact.mode = x.mode;
    if (typeof x.strength === "number") tools.redact.strength = x.strength;
    tools.redact.strength = clampStrength(tools.redact.mode, tools.redact.strength);
  }
  const n = src.badge;
  if (n && typeof n === "object") {
    if (isColorKey(n.color)) tools.badge.color = n.color;
    if (isWidth(n.size)) tools.badge.size = n.size;
  }
  if (Array.isArray(r.recentFonts))
    recentFonts = r.recentFonts
      .filter((f): f is string => typeof f === "string")
      .slice(0, RECENT_FONTS);
  return { tools, recentFonts };
}

interface SettingsState {
  tools: ToolSettings;
  recentFonts: string[];
  sticky: boolean;
  loaded: boolean;
  /** Seed from config, then apply the state file. */
  init(defaults: ConfigDefaults | undefined, sticky: boolean): Promise<void>;
  setTool(tool: ObjectType, patch: SettingsPatch): void;
  useFont(font: string): void;
}

let timer: ReturnType<typeof setTimeout> | null = null;
function scheduleWrite() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const { tools, recentFonts } = useSettings.getState();
    writeState({ version: STATE_VERSION, tools, recentFonts }).catch(() => {
      /* Logged by the backend; not running inside Tauri otherwise. */
    });
  }, WRITE_DELAY);
}

function pick<T>(base: T, patch: SettingsPatch): T {
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const k of Object.keys(out)) if (k in patch) out[k] = (patch as Record<string, unknown>)[k];
  return out as T;
}

export const useSettings = create<SettingsState>((set, get) => ({
  tools: builtInDefaults(),
  recentFonts: [],
  sticky: true,
  loaded: false,

  async init(defaults, sticky) {
    const base = seedFromConfig(defaults);
    let raw: unknown = null;
    try {
      raw = await readState();
    } catch {
      /* Not running inside Tauri. */
    }
    const { tools, recentFonts } = mergeState(base, raw);
    set({ tools, recentFonts, sticky, loaded: true });
  },
  setTool(tool, patch) {
    const next = pick(get().tools[tool], patch) as unknown as Record<string, unknown>;
    // `size` means font size for text and S/M/L for badges.
    if (tool === "text" && typeof next.size !== "number") next.size = get().tools.text.size;
    if (tool === "badge" && !isWidth(next.size)) next.size = get().tools.badge.size;
    if (tool === "redact") {
      const r = next as unknown as RedactSettings;
      r.strength = clampStrength(r.mode, r.strength);
    }
    const tools = { ...get().tools, [tool]: next } as ToolSettings;
    set({ tools });
    scheduleWrite();
  },
  useFont(font) {
    const recentFonts = [font, ...get().recentFonts.filter((f) => f !== font)].slice(
      0,
      RECENT_FONTS,
    );
    set({ recentFonts });
    scheduleWrite();
  },
}));
