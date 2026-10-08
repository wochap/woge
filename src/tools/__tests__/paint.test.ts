import Konva from "konva";
import { addPoint, chaikin, constrain, finishStroke, DECIMATE_PX } from "../freehand/math";
import { redactLayout, unrotateRect } from "../redact/math";
import { rotateRect90 } from "../../model/geometry";
import { shapeFromDrag, tooSmall } from "../shapes/math";
import { builtInDefaults } from "../../store/settings";

describe("freehand", () => {
  it("decimates closer than 1.5 image px", () => {
    const pts = [{ x: 0, y: 0 }];
    expect(addPoint(pts, { x: 1, y: 1 })).toBe(false);
    expect(addPoint(pts, { x: DECIMATE_PX, y: 0 })).toBe(true);
    expect(pts).toHaveLength(2);
  });

  it("brush Shift locks to an axis, highlighter Shift draws a straight line", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 5, y: 3 },
      { x: 20, y: 4 },
    ];
    expect(constrain(pts, "brush", true).every((p) => p.y === 0)).toBe(true);
    const v = [
      { x: 0, y: 0 },
      { x: 2, y: 30 },
    ];
    expect(constrain(v, "brush", true).every((p) => p.x === 0)).toBe(true);
    expect(constrain(pts, "highlight", true)).toEqual([pts[0], pts[2]]);
    expect(constrain(pts, "brush", false)).toBe(pts);
  });

  it("a click is a dot; smoothing keeps endpoints", () => {
    expect(finishStroke([{ x: 3, y: 4 }], "brush", false, true)).toEqual([3, 4, 3, 4]);
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const c = chaikin(pts);
    expect(c[0]).toEqual(pts[0]);
    expect(c[c.length - 1]).toEqual(pts[2]);
    expect(c.length).toBe(6);
    expect(finishStroke(pts, "highlight", false, true)).toEqual([0, 0, 10, 0, 10, 10]);
  });
});

describe("redact", () => {
  it("creates from drag with tool defaults", () => {
    const o = shapeFromDrag(
      "redact",
      { x: 0, y: 0 },
      { x: 50, y: 20 },
      { shift: false, alt: false },
      builtInDefaults(),
    );
    expect(o).toMatchObject({ type: "redact", w: 50, h: 20, mode: "pixelate", strength: 12 });
    expect(tooSmall({ ...o, w: 2, h: 2 } as typeof o)).toBe(true);
  });

  it("inverse rotation recovers the base rect", () => {
    const base = { w: 100, h: 50 };
    const r = { x: 10, y: 5, w: 20, h: 8 };
    // Forward: base → rotated by 90/180/270 cw.
    let cur = { ...base };
    let fwd = r;
    for (const rot of [90, 180, 270] as const) {
      fwd = rotateRect90(fwd, cur.w, cur.h, "cw");
      cur = { w: cur.h, h: cur.w };
      expect(unrotateRect(fwd, rot, base)).toEqual(r);
    }
    expect(unrotateRect(r, 0, base)).toEqual(r);
  });

  it("clamps the crop to the image", () => {
    const l = redactLayout({ x: -10, y: 40, w: 30, h: 30 }, 0, { w: 100, h: 50 })!;
    expect(l).toMatchObject({
      x: 10,
      y: 0,
      w: 20,
      h: 10,
      crop: { x: 0, y: 40, width: 20, height: 10 },
    });
    expect(redactLayout({ x: 200, y: 0, w: 10, h: 10 }, 0, { w: 100, h: 50 })).toBeNull();
    const r = redactLayout({ x: 0, y: 0, w: 10, h: 20 }, 90, { w: 100, h: 50 })!;
    expect(r.image).toMatchObject({ x: 10, y: 0, width: 20, height: 10, rotation: 90 });
  });

  it("pixelate bakes block averages and leaves no original pixel", () => {
    // 8×8 checkerboard of distinct values; pixelSize 4 averages each 4×4 block.
    const w = 8;
    const data = new Uint8ClampedArray(w * w * 4);
    for (let i = 0; i < w * w; i++) {
      const v = (i * 37) % 251;
      data.set([v, 255 - v, (v * 3) % 256, 255], i * 4);
    }
    const original = data.slice();
    const img = { data, width: w, height: w } as ImageData;
    (Konva.Filters.Pixelate as (this: Konva.Node, d: ImageData) => void).call(
      { pixelSize: () => 4 } as unknown as Konva.Node,
      img,
    );
    for (let by = 0; by < 2; by++)
      for (let bx = 0; bx < 2; bx++) {
        const first = (by * 4 * w + bx * 4) * 4;
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 4; x++) {
            const i = ((by * 4 + y) * w + bx * 4 + x) * 4;
            expect([...data.slice(i, i + 3)]).toEqual([...data.slice(first, first + 3)]);
          }
      }
    let same = 0;
    for (let i = 0; i < data.length; i += 4)
      if (
        data[i] === original[i] &&
        data[i + 1] === original[i + 1] &&
        data[i + 2] === original[i + 2]
      )
        same++;
    expect(same).toBeLessThan((w * w) / 4);
  });
});
