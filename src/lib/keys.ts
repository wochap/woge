import { useEffect, useRef } from "react";

export type KeyColumn = "tools" | "navigation" | "file";

export interface KeyBinding {
  id: string;
  label: string;
  /** Combos matched against events, e.g. "ctrl+shift+z", "shift+1", "?". Empty = display only. */
  keys: string[];
  /** Text shown in the overlay and tooltips. */
  display: string;
  column: KeyColumn;
  /** Whether an action exists yet; disabled entries are listed but never dispatched. */
  enabled: boolean;
}

const b = (
  id: string,
  label: string,
  column: KeyColumn,
  display: string,
  keys: string[] = [],
  enabled = false,
): KeyBinding => ({ id, label, column, display, keys, enabled });

/** Every shortcut from the design's overlay (board 1f). */
export const KEYMAP: KeyBinding[] = [
  b("tool.select", "Select", "tools", "V", ["v"], true),
  b("tool.crop", "Crop", "tools", "C", ["c"], true),
  b("tool.resize", "Resize", "tools", "S", ["s"], true),
  b("tool.rotate", "Rotate / reverse", "tools", "L · ⇧L", ["l", "shift+l"], true),
  b("tool.rect", "Rectangle", "tools", "R", ["r"]),
  b("tool.ellipse", "Ellipse", "tools", "O", ["o"]),
  b("tool.arrow", "Arrow", "tools", "A", ["a"]),
  b("tool.text", "Text", "tools", "T", ["t"]),
  b("tool.brush", "Brush", "tools", "B", ["b"]),
  b("tool.highlighter", "Highlighter", "tools", "H", ["h"]),
  b("tool.redact", "Redact", "tools", "X", ["x"]),
  b("tool.counter", "Counter badge", "tools", "N", ["n"]),
  b("edit.delete", "Delete selection", "tools", "Del", ["delete", "backspace"]),

  b("nav.pan", "Pan", "navigation", "Scroll", [], true),
  b("nav.panDrag", "Pan (drag)", "navigation", "Space + drag", [], true),
  b("nav.zoom", "Zoom", "navigation", "Ctrl + Scroll", [], true),
  b("nav.pinch", "Zoom (touchpad)", "navigation", "Pinch", [], true),
  b("view.fit", "Fit to window", "navigation", "⇧1", ["shift+1", "shift+!"], true),
  b("view.actual", "Actual size", "navigation", "⇧0", ["shift+0", "shift+)"], true),
  b(
    "view.zoomIn",
    "Zoom in",
    "navigation",
    "Ctrl +",
    ["ctrl+=", "ctrl++", "ctrl+shift+=", "ctrl+shift++"],
    true,
  ),
  b("view.zoomOut", "Zoom out", "navigation", "Ctrl −", ["ctrl+-", "ctrl+_", "ctrl+shift+-"], true),

  b("file.open", "Open", "file", "Ctrl O", ["ctrl+o"], true),
  b("file.paste", "Paste image", "file", "Ctrl V", ["ctrl+v"], true),
  b("file.copy", "Copy result", "file", "Ctrl C", ["ctrl+c"]),
  b("file.save", "Save", "file", "Ctrl S", ["ctrl+s"]),
  b("file.saveAs", "Save as", "file", "Ctrl ⇧S", ["ctrl+shift+s"]),
  b("edit.undo", "Undo / Redo", "file", "Ctrl Z · ⇧Z", ["ctrl+z", "ctrl+shift+z"], true),
  b("edit.applyCancel", "Apply / Cancel", "file", "Enter · Esc", ["enter", "escape"], true),
  b(
    "edit.nudge",
    "Nudge crop / size",
    "file",
    "Arrows · ⇧",
    ["arrowleft", "arrowright", "arrowup", "arrowdown"].flatMap((k) => [k, `shift+${k}`]),
    true,
  ),
  b("edit.constrain", "Constrain (square, aspect)", "file", "Shift", []),
  b("app.shortcuts", "Shortcuts", "file", "?", ["?", "shift+?", "shift+/"], true),
  b("app.quit", "Quit", "file", "Ctrl Q", ["ctrl+q"], true),
];

export const COLUMNS: { id: KeyColumn; title: string }[] = [
  { id: "tools", title: "Tools" },
  { id: "navigation", title: "Navigation" },
  { id: "file", title: "File & edit" },
];

export function bindingById(id: string): KeyBinding | undefined {
  return KEYMAP.find((k) => k.id === id);
}

/** Normalise a keyboard event to "ctrl+shift+alt+key" form. */
export function comboOf(
  e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey" | "code">,
): string {
  let key = e.key.toLowerCase();
  if (key === " ") key = "space";
  // Shift+digit reports the shifted glyph on most layouts; fall back to the physical digit.
  if (e.shiftKey && /^Digit\d$/.test(e.code)) key = e.code.slice(5);
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.shiftKey) parts.push("shift");
  if (e.altKey) parts.push("alt");
  parts.push(key);
  return parts.join("+");
}

/** Match a combo against the table. "?" is matched by key alone whatever the shift state. */
export function matchBinding(
  combo: string,
  key: string,
  table: KeyBinding[] = KEYMAP,
): KeyBinding | undefined {
  return table.find(
    (b) => b.enabled && (b.keys.includes(combo) || (key === "?" && b.keys.includes("?"))),
  );
}

export function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (target as HTMLInputElement).type;
    return !["button", "checkbox", "radio", "range", "color", "submit", "reset"].includes(type);
  }
  return false;
}

/** Handlers receive the event so one binding can branch on Shift or the key. */
export type KeyHandlers = Partial<Record<string, (e: KeyboardEvent) => void>>;

export interface KeymapOptions {
  /** While true only `overlayKeys` handlers fire (the overlay owns the keyboard). */
  overlayOpen?: boolean;
  overlayKeys?: string[];
}

export function dispatchKey(
  e: KeyboardEvent,
  handlers: KeyHandlers,
  opts: KeymapOptions = {},
): boolean {
  if (isTextTarget(e.target)) return false;
  if (opts.overlayOpen) {
    const k = e.key === "Escape" ? "escape" : e.key;
    if (k === "escape" || k === "?" || opts.overlayKeys?.includes(k)) {
      e.preventDefault();
      handlers["overlay.close"]?.(e);
      return true;
    }
    return false;
  }
  const binding = matchBinding(comboOf(e), e.key);
  if (!binding) return false;
  const handler = handlers[binding.id];
  if (!handler) return false;
  e.preventDefault();
  handler(e);
  return true;
}

/** One window-level dispatcher for the editor. Handlers may change every render. */
export function useKeymap(handlers: KeyHandlers, opts: KeymapOptions = {}) {
  const ref = useRef({ handlers, opts });
  ref.current = { handlers, opts };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat && !/^(ctrl\+[=+\-_])/.test(comboOf(e))) {
        // Allow repeat only for zoom steps.
        if (!isTextTarget(e.target)) e.preventDefault();
        return;
      }
      dispatchKey(e, ref.current.handlers, ref.current.opts);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
