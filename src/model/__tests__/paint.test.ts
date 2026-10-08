import {
  applyPatch,
  badgeTextColor,
  boundsOf,
  nextBadgeNumber,
  renumberBadges,
  rotateObject90,
  scaleObj,
  translate,
  BADGE_DARK,
  BADGE_LIGHT,
  type BadgeObj,
  type RedactObj,
  type StrokeObj,
} from "../objects";
import { PALETTE } from "../palette";

const stroke: StrokeObj = {
  id: "s",
  z: 1,
  type: "brush",
  points: [0, 0, 10, 20],
  stroke: "red",
  strokeWidth: "M",
  smooth: true,
};
const redact: RedactObj = {
  id: "r",
  z: 2,
  type: "redact",
  x: 10,
  y: 20,
  w: 30,
  h: 40,
  mode: "pixelate",
  strength: 12,
};
const badge = (id: string, n: number, z = n): BadgeObj => ({
  id,
  z,
  type: "badge",
  x: 50,
  y: 50,
  n,
  color: "mauve",
  size: "M",
});

describe("paint objects", () => {
  it("bounds", () => {
    expect(boundsOf(stroke)).toEqual({ x: 0, y: 0, w: 10, h: 20 });
    expect(boundsOf(redact)).toEqual({ x: 10, y: 20, w: 30, h: 40 });
    expect(boundsOf(badge("b", 1))).toEqual({ x: 36, y: 36, w: 28, h: 28 });
  });

  it("translate and scale", () => {
    expect(translate(stroke, 5, 5).points).toEqual([5, 5, 15, 25]);
    const from = { x: 0, y: 0, w: 10, h: 20 };
    const to = { x: 0, y: 0, w: 20, h: 40 };
    expect(scaleObj(stroke, from, to).points).toEqual([0, 0, 20, 40]);
    expect(scaleObj(stroke, from, to).strokeWidth).toBe("M");
    expect(
      scaleObj(redact, { x: 10, y: 20, w: 30, h: 40 }, { x: 10, y: 20, w: 60, h: 80 }),
    ).toMatchObject({ w: 60, h: 80 });
    // Badges keep their size; only the centre maps.
    const b = scaleObj(
      badge("b", 1),
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 0, y: 0, w: 200, h: 200 },
    );
    expect(b).toMatchObject({ x: 100, y: 100, size: "M" });
  });

  it("rotates points and rects with the image", () => {
    // 100×50 image rotated cw becomes 50×100; (x, y) → (h - y, x).
    expect(rotateObject90(stroke, 100, 50, "cw").points).toEqual([50, 0, 30, 10]);
    expect(rotateObject90(redact, 100, 50, "cw")).toMatchObject({ x: -10, y: 10, w: 40, h: 30 });
    expect(rotateObject90(badge("b", 1), 100, 50, "cw")).toMatchObject({ x: 0, y: 50 });
  });

  it("patches only meaningful fields", () => {
    expect(applyPatch(badge("b", 1), { stroke: "red", size: "L" })).toMatchObject({
      color: "red",
      size: "L",
    });
    expect(applyPatch(badge("b", 1), { size: 30 })).toMatchObject({ size: "M" });
    expect(applyPatch(redact, { strength: 999 })).toMatchObject({ strength: 64 });
    expect(applyPatch(redact, { mode: "blur" })).toMatchObject({ mode: "blur", strength: 12 });
    expect(applyPatch(stroke, { color: "blue", smooth: false })).toMatchObject({
      stroke: "blue",
      smooth: false,
    });
  });

  it("numbers badges", () => {
    expect(nextBadgeNumber([])).toBe(1);
    const objs = [badge("a", 1), badge("c", 3), badge("d", 4), stroke];
    expect(nextBadgeNumber(objs)).toBe(5);
    const r = renumberBadges(objs);
    expect(r.filter((o) => o.type === "badge").map((o) => (o as BadgeObj).n)).toEqual([1, 2, 3]);
    expect(r[3]).toBe(stroke);
  });

  it("badge number contrast per flavour", () => {
    expect(badgeTextColor(PALETTE.mocha.yellow)).toBe(BADGE_DARK);
    for (const c of Object.values(PALETTE.mocha).slice(0, 8))
      expect(badgeTextColor(c)).toBe(BADGE_DARK);
    for (const c of Object.values(PALETTE.latte).slice(0, 8))
      expect(badgeTextColor(c)).toBe(BADGE_LIGHT);
  });
});
