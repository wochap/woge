import { anchorPoint, dragDraft, panForDraft } from "../resize/math";

const orig = { w: 1920, h: 1080 };
const start = { x: 0, y: 0, ...orig };

describe("resize anchor", () => {
  it("top handle keeps the bottom edge", () => {
    const r = dragDraft(start, orig, "n", { x: 0, y: -100 }, false, false);
    expect(r.h).toBe(1180);
    expect(r.y + r.h).toBe(1080);
    expect(r.x).toBe(0);
  });

  it("left handle keeps the right edge", () => {
    const r = dragDraft(start, orig, "w", { x: 200, y: 0 }, false, false);
    expect(r.w).toBe(1720);
    expect(r.x + r.w).toBe(1920);
  });

  it("top-left keeps bottom-right with lock rounding", () => {
    const r = dragDraft(start, orig, "nw", { x: 384, y: 0 }, true, false);
    expect(r).toMatchObject({ w: 1536, h: 864 });
    expect(r.x + r.w).toBe(1920);
    expect(r.y + r.h).toBe(1080);
    const odd = dragDraft(start, orig, "nw", { x: 333.3, y: 0 }, true, false);
    expect(odd.x + odd.w).toBe(1920);
    expect(odd.y + odd.h).toBe(1080);
  });

  it("Alt keeps the centre", () => {
    const r = dragDraft(start, orig, "se", { x: -100, y: 0 }, false, true);
    expect(r.x + r.w / 2).toBe(960);
    expect(r.y + r.h / 2).toBe(540);
  });

  it("pin sits at the anchor", () => {
    expect(anchorPoint(start, "nw", false)).toEqual({ x: 1920, y: 1080 });
    expect(anchorPoint(start, "n", false)).toEqual({ x: 960, y: 1080 });
    expect(anchorPoint(start, "e", true)).toEqual({ x: 960, y: 540 });
  });

  it("confirm pan keeps screen position", () => {
    const view = { x: 10, y: 20, scale: 0.5 };
    const draft = { x: 384, y: 216, w: 1536, h: 864 };
    const v = panForDraft(view, draft);
    // Draft top-left on screen before == new image origin on screen after.
    expect(v.x).toBe(view.x + draft.x * view.scale);
    expect(v.y).toBe(view.y + draft.y * view.scale);
  });
});
