import {
  MAX_SCALE,
  MIN_SCALE,
  applyWheel,
  clampScale,
  fitTransform,
  imageToScreen,
  keepCentre,
  screenToImage,
  zoomAround,
  zoomPercent,
} from "../viewport";

const canvas = { width: 1200, height: 700 };

describe("fitTransform", () => {
  it("fits a large image at about 60%, centred", () => {
    const v = fitTransform({ width: 1920, height: 1080 }, canvas);
    expect(v.scale).toBeCloseTo((1200 - 48) / 1920, 5);
    expect(Math.round(v.scale * 100)).toBe(60);
    const c = imageToScreen(v, { x: 960, y: 540 });
    expect(c.x).toBeCloseTo(600);
    expect(c.y).toBeCloseTo(350);
  });

  it("never scales small images above 100%", () => {
    const v = fitTransform({ width: 300, height: 200 }, canvas);
    expect(v.scale).toBe(1);
    expect(v).toEqual({ scale: 1, x: 450, y: 250 });
  });
});

describe("zoom", () => {
  it("keeps the image pixel under the pointer", () => {
    const v = { x: 37, y: -12, scale: 0.6 };
    const pointer = { x: 400, y: 300 };
    const before = screenToImage(v, pointer);
    const next = applyWheel(v, { deltaX: 0, deltaY: -40, ctrlKey: true, shiftKey: false }, pointer);
    expect(next.scale).toBeGreaterThan(v.scale);
    const after = screenToImage(next, pointer);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("clamps to 5%–3200%", () => {
    expect(clampScale(100)).toBe(MAX_SCALE);
    expect(clampScale(0.001)).toBe(MIN_SCALE);
    let v = { x: 0, y: 0, scale: 1 };
    for (let i = 0; i < 100; i++) v = zoomAround(v, 1.25, { x: 10, y: 10 });
    expect(v.scale).toBe(32);
    expect(zoomPercent(v.scale)).toBe("3200%");
  });
});

describe("wheel pan", () => {
  const v = { x: 100, y: 100, scale: 2 };
  it("pans by both deltas without modifiers", () => {
    const n = applyWheel(
      v,
      { deltaX: 30, deltaY: -12, ctrlKey: false, shiftKey: false },
      { x: 0, y: 0 },
    );
    expect(n).toEqual({ x: 70, y: 112, scale: 2 });
  });
  it("shift + vertical wheel pans horizontally", () => {
    const n = applyWheel(
      v,
      { deltaX: 0, deltaY: 100, ctrlKey: false, shiftKey: true },
      { x: 0, y: 0 },
    );
    expect(n).toEqual({ x: 0, y: 100, scale: 2 });
  });
});

describe("resize", () => {
  it("keeps the centre point", () => {
    const v = { x: 10, y: 20, scale: 2 };
    const from = { width: 800, height: 600 };
    const to = { width: 1000, height: 700 };
    const before = screenToImage(v, { x: 400, y: 300 });
    const after = screenToImage(keepCentre(v, from, to), { x: 500, y: 350 });
    expect(after).toEqual(before);
  });
});
