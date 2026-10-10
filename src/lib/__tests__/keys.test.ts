import { COLUMNS, KEYMAP, comboOf, dispatchKey, matchBinding } from "../keys";

function key(init: KeyboardEventInit & { key: string }, target?: EventTarget) {
  const e = new KeyboardEvent("keydown", { cancelable: true, ...init });
  if (target) Object.defineProperty(e, "target", { value: target });
  return e;
}

describe("keymap", () => {
  it("normalises modifiers", () => {
    expect(comboOf(key({ key: "Z", ctrlKey: true, shiftKey: true }))).toBe("ctrl+shift+z");
    expect(comboOf(key({ key: "!", shiftKey: true, code: "Digit1" }))).toBe("shift+1");
    expect(comboOf(key({ key: "=", metaKey: true }))).toBe("ctrl+=");
  });

  it("matches digits and brackets by physical key", () => {
    // AZERTY: unshifted Digit3 reports '"'.
    expect(comboOf(key({ key: '"', code: "Digit3" }))).toBe("3");
    // Shift+[ reports "{" on US layouts.
    expect(comboOf(key({ key: "{", shiftKey: true, code: "BracketLeft" }))).toBe("shift+[");
    expect(comboOf(key({ key: "}", shiftKey: true, code: "BracketRight" }))).toBe("shift+]");
    expect(comboOf(key({ key: "}", ctrlKey: true, shiftKey: true, code: "BracketRight" }))).toBe(
      "ctrl+shift+]",
    );
    expect(matchBinding("shift+1", "!")?.id).not.toBe("view.fit");
  });

  it("matches modifiers exactly", () => {
    expect(matchBinding("ctrl+o", "o")?.id).toBe("file.open");
    expect(matchBinding("o", "o")?.id).toBe("tool.ellipse");
    expect(matchBinding("b", "b")?.id).toBe("tool.brush");
    expect(matchBinding("ctrl+b", "b")).toBeUndefined();
    expect(matchBinding("ctrl+shift+}", "}")?.id).toBe("edit.forward");
    expect(matchBinding("ctrl+d", "d")?.id).toBe("edit.duplicate");
    expect(matchBinding("ctrl+shift+z", "z")?.id).toBe("edit.undo");
    expect(matchBinding("v", "v")?.id).toBe("tool.select");
    expect(matchBinding("ctrl+v", "v")?.id).toBe("file.paste");
    expect(matchBinding("shift+1", "!")?.id).toBe("colour.fill");
    expect(matchBinding("ctrl+0", "0")?.id).toBe("view.fit");
    expect(matchBinding("ctrl+1", "1")?.id).toBe("view.actual");
    expect(matchBinding("6", "6")?.id).toBe("colour.primary");
    expect(matchBinding("[", "[")?.id).toBe("opacity.primary");
    expect(matchBinding("shift+]", "}")?.id).toBe("opacity.fill");
    expect(matchBinding("shift+?", "?")?.id).toBe("app.shortcuts");
    expect(matchBinding("ctrl+c", "c")?.id).toBe("file.copy");
    expect(matchBinding("ctrl+s", "s")?.id).toBe("file.save");
    expect(matchBinding("ctrl+shift+s", "S")?.id).toBe("file.saveAs");
    expect(matchBinding("ctrl+q", "q")?.id).toBe("app.quit");
  });

  it("dispatches and prevents default", () => {
    const fit = vi.fn();
    const e = key({ key: "0", ctrlKey: true, code: "Digit0" });
    expect(dispatchKey(e, { "view.fit": fit })).toBe(true);
    expect(fit).toHaveBeenCalledOnce();
    expect(e.defaultPrevented).toBe(true);
  });

  it("ignores text fields", () => {
    const select = vi.fn();
    const input = document.createElement("input");
    const area = document.createElement("textarea");
    const editable = document.createElement("div");
    editable.contentEditable = "true";
    Object.defineProperty(editable, "isContentEditable", { value: true });
    for (const t of [input, area, editable])
      dispatchKey(key({ key: "v" }, t), { "tool.select": select });
    expect(select).not.toHaveBeenCalled();
  });

  it("is inert while the overlay is open except for close keys", () => {
    const select = vi.fn();
    const close = vi.fn();
    const h = { "tool.select": select, "overlay.close": close };
    dispatchKey(key({ key: "v" }), h, { overlayOpen: true });
    expect(select).not.toHaveBeenCalled();
    dispatchKey(key({ key: "Escape" }), h, { overlayOpen: true });
    dispatchKey(key({ key: "?" }), h, { overlayOpen: true });
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("covers all four overlay columns", () => {
    for (const c of COLUMNS) expect(KEYMAP.some((k) => k.column === c.id)).toBe(true);
    expect(KEYMAP.find((k) => k.id === "tool.rotate")?.keys).toEqual(["l", "shift+l"]);
  });
});
