import type { Icon } from "@phosphor-icons/react";
import {
  ArrowClockwise,
  ArrowUpRight,
  ArrowUUpLeft,
  ArrowUUpRight,
  ArrowsOut,
  Circle,
  Crop,
  Cursor,
  EyeSlash,
  Highlighter,
  NumberCircleOne,
  PaintBrush,
  Rectangle,
  TextT,
} from "@phosphor-icons/react";

export type ToolId =
  | "select"
  | "crop"
  | "resize"
  | "rotate"
  | "rect"
  | "ellipse"
  | "arrow"
  | "text"
  | "brush"
  | "highlighter"
  | "redact"
  | "counter";

export interface ToolDef {
  kind: "tool" | "action";
  id: ToolId | "undo" | "redo";
  name: string;
  /** Shortcut shown in the tooltip kbd chip. */
  shortcut: string;
  icon: Icon;
  enabled: boolean;
  /** Keymap entry dispatching to this tool. */
  binding: string;
  /** Tools with an options strip (none yet). */
  hasOptions?: boolean;
}

export type ToolbarEntry = ToolDef | { kind: "divider" };

const t = (
  id: ToolId,
  name: string,
  shortcut: string,
  icon: Icon,
  binding: string,
  enabled = false,
): ToolDef => ({
  kind: "tool",
  id,
  name,
  shortcut,
  icon,
  binding,
  enabled,
});

export const TOOLBAR: ToolbarEntry[] = [
  t("select", "Select", "V", Cursor, "tool.select", true),
  t("crop", "Crop", "C", Crop, "tool.crop", true),
  t("resize", "Resize", "S", ArrowsOut, "tool.resize", true),
  t("rotate", "Rotate", "L · Shift+L", ArrowClockwise, "tool.rotate", true),
  { kind: "divider" },
  t("rect", "Rectangle", "R", Rectangle, "tool.rect", true),
  t("ellipse", "Ellipse", "O", Circle, "tool.ellipse", true),
  t("arrow", "Arrow", "A", ArrowUpRight, "tool.arrow", true),
  t("text", "Text", "T", TextT, "tool.text", true),
  t("brush", "Brush", "B", PaintBrush, "tool.brush", true),
  t("highlighter", "Highlighter", "H", Highlighter, "tool.highlighter", true),
  t("redact", "Redact", "X", EyeSlash, "tool.redact", true),
  t("counter", "Counter badge", "N", NumberCircleOne, "tool.counter", true),
];

export const HISTORY: ToolDef[] = [
  {
    kind: "action",
    id: "undo",
    name: "Undo",
    shortcut: "Ctrl+Z",
    icon: ArrowUUpLeft,
    enabled: false,
    binding: "edit.undo",
  },
  {
    kind: "action",
    id: "redo",
    name: "Redo",
    shortcut: "Ctrl+Shift+Z",
    icon: ArrowUUpRight,
    enabled: false,
    binding: "edit.redo",
  },
];

export function toolById(id: ToolId): ToolDef | undefined {
  return TOOLBAR.find((e): e is ToolDef => e.kind === "tool" && e.id === id);
}
