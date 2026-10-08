import { closeCode, defaultSaveAsPath, isDirty, resolveChosenPath, timestamp } from "../output";
import { newDocument } from "../../model/document";
import * as H from "../history";

describe("output helpers", () => {
  it("dirty follows reference equality with the last saved document", () => {
    const d = newDocument({ path: null, name: "stdin", width: 10, height: 10 });
    let h = H.reset(d);
    expect(isDirty(h.present, d)).toBe(false);
    h = H.commit(h, { ...d, size: { w: 5, h: 5 } });
    expect(isDirty(h.present, d)).toBe(true);
    h = H.undo(h);
    expect(isDirty(h.present, d)).toBe(false);
    expect(isDirty(null, null)).toBe(false);
  });

  it("default Save as names", () => {
    expect(defaultSaveAsPath("/tmp/shot.png", "png", "")).toBe("/tmp/shot-edited.png");
    expect(defaultSaveAsPath("/tmp/a.b.png", "jpeg", "")).toBe("/tmp/a.b-edited.jpg");
    const now = new Date(2026, 9, 7, 9, 5, 3);
    expect(timestamp(now)).toBe("20261007-090503");
    expect(defaultSaveAsPath(null, "png", "/home/u/Pictures/", now)).toBe(
      "/home/u/Pictures/woge-20261007-090503.png",
    );
  });

  it("dialog extension handling", () => {
    expect(resolveChosenPath("/t/out.webp", "png")).toEqual({
      path: "/t/out.webp",
      format: "webp",
      appended: false,
    });
    expect(resolveChosenPath("/t/out.bmp", "png")).toEqual({
      path: "/t/out.bmp.png",
      format: "png",
      appended: true,
    });
  });

  it("exit codes on close", () => {
    expect(closeCode(true, false)).toBe(1);
    expect(closeCode(true, true)).toBe(0);
    expect(closeCode(false, false)).toBe(0);
  });
});
