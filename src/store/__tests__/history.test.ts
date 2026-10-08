import { describe, expect, it } from "vitest";
import { newDocument } from "../../model/document";
import { rotateDocument } from "../../model/geometry";
import { HISTORY_CAP, canRedo, canUndo, commit, redo, reset, undo } from "../history";

const doc = newDocument({ path: null, name: "a", width: 100, height: 50 });

describe("history", () => {
  it("undo and redo", () => {
    let h = commit(reset(doc), rotateDocument(doc, "cw"));
    expect(canUndo(h)).toBe(true);
    h = undo(h);
    expect(h.present).toEqual(doc);
    expect(canRedo(h)).toBe(true);
    h = redo(h);
    expect(h.present.rotation).toBe(90);
  });

  it("new edit clears redo", () => {
    let h = undo(commit(reset(doc), rotateDocument(doc, "cw")));
    h = commit(h, rotateDocument(doc, "ccw"));
    expect(canRedo(h)).toBe(false);
  });

  it("caps at 200", () => {
    let h = reset(doc);
    for (let i = 0; i < 201; i++) h = commit(h, { ...doc, size: { w: i + 1, h: 1 } });
    expect(h.past.length).toBe(HISTORY_CAP);
    let n = 0;
    while (canUndo(h)) {
      h = undo(h);
      n++;
    }
    expect(n).toBe(200);
    expect(h.present.size.w).toBe(1);
  });

  it("reset clears both stacks", () => {
    const h = reset(doc);
    expect(canUndo(h) || canRedo(h)).toBe(false);
  });
});
