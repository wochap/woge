import { create } from "zustand";
import { readState, writeState, type ConfigDefaults } from "../lib/backend";
import { isColorKey, type ColorKey } from "../model/palette";
import {
  PIXELATE_RANGE,
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
  strokeWidth: StrokeWidth;
  fill: boolean;
}
export interface ArrowSettings {
  stroke: ColorKey;
  strokeWidth: StrokeWidth;
  heads: ArrowHeads;
}
export interface TextSettings {
  color: ColorKey;
  font: string;
  size: number;
  bold: boolean;
  plate: boolean;
}

export interface BrushSettings {
  stroke: ColorKey;
  strokeWidth: StrokeWidth;
  smooth: boolean;
}
export interface HighlightSettings {
  stroke: ColorKey;
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

export function builtInDefaults(): ToolSettings {
  return {
    rect: { stroke: "red", strokeWidth: "M", fill: false },
    ellipse: { stroke: "red", strokeWidth: "M", fill: false },
    arrow: { stroke: "red", strokeWidth: "M", heads: "end" },
    text: { color: "red", font: DEFAULT_FONT, size: 24, bold: false, plate: false },
    brush: { stroke: "red", strokeWidth: "M", smooth: true },
    highlight: { stroke: "yellow", strokeWidth: "M" },
    redact: { mode: "pixelate", strength: PIXELATE_RANGE.default },
    badge: { color: "mauve", size: "M" },
  };
}

const isWidth = (v: unknown): v is StrokeWidth => v === "S" || v === "M" || v === "L";

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
    if (typeof s.fill === "boolean") tools[k].fill = s.fill;
  }
  const a = src.arrow;
  if (a && typeof a === "object") {
    if (isColorKey(a.stroke)) tools.arrow.stroke = a.stroke;
    if (isWidth(a.strokeWidth)) tools.arrow.strokeWidth = a.strokeWidth;
    if (a.heads === "end" || a.heads === "both") tools.arrow.heads = a.heads;
  }
  const t = src.text;
  if (t && typeof t === "object") {
    if (isColorKey(t.color)) tools.text.color = t.color;
    if (typeof t.font === "string" && t.font) tools.text.font = t.font;
    if (typeof t.size === "number") tools.text.size = clampTextSize(t.size);
    if (typeof t.bold === "boolean") tools.text.bold = t.bold;
    if (typeof t.plate === "boolean") tools.text.plate = t.plate;
  }
  const b = src.brush;
  if (b && typeof b === "object") {
    if (isColorKey(b.stroke)) tools.brush.stroke = b.stroke;
    if (isWidth(b.strokeWidth)) tools.brush.strokeWidth = b.strokeWidth;
    if (typeof b.smooth === "boolean") tools.brush.smooth = b.smooth;
  }
  const h = src.highlight;
  if (h && typeof h === "object") {
    if (isColorKey(h.stroke)) tools.highlight.stroke = h.stroke;
    if (isWidth(h.strokeWidth)) tools.highlight.strokeWidth = h.strokeWidth;
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
