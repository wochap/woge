import { shapeFromDrag, tooSmall } from "../shapes/math";
import { builtInDefaults } from "../../store/settings";
import type { ArrowObj } from "../../model/objects";

const s = builtInDefaults();
const none = { shift: false, alt: false };

describe("shape creation", () => {
  it("rect from drag", () => {
    expect(shapeFromDrag("rect", { x: 100, y: 100 }, { x: 400, y: 300 }, none, s)).toMatchObject({
      x: 100,
      y: 100,
      w: 300,
      h: 200,
      stroke: "red",
      strokeWidth: "M",
      fill: false,
    });
  });

  it("shift makes a circle", () => {
    const o = shapeFromDrag(
      "ellipse",
      { x: 0, y: 0 },
      { x: 300, y: 120 },
      { shift: true, alt: false },
      s,
    );
    expect(o).toMatchObject({ w: 300, h: 300 });
  });

  it("alt draws from the centre", () => {
    const o = shapeFromDrag(
      "rect",
      { x: 100, y: 100 },
      { x: 150, y: 120 },
      { shift: false, alt: true },
      s,
    );
    expect(o).toMatchObject({ x: 50, y: 80, w: 100, h: 40 });
  });

  it("arrow snaps to 45°", () => {
    const len = 100;
    const ang = (40 * Math.PI) / 180;
    const o = shapeFromDrag(
      "arrow",
      { x: 0, y: 0 },
      { x: Math.cos(ang) * len, y: Math.sin(ang) * len },
      { shift: true, alt: false },
      s,
    ) as ArrowObj;
    expect(Math.atan2(o.y2 - o.y1, o.x2 - o.x1)).toBeCloseTo(Math.PI / 4);
    expect(o.heads).toBe("end");
  });

  it("tiny drags are discarded", () => {
    expect(tooSmall(shapeFromDrag("rect", { x: 5, y: 5 }, { x: 6, y: 7 }, none, s))).toBe(true);
    expect(tooSmall(shapeFromDrag("rect", { x: 5, y: 5 }, { x: 5, y: 30 }, none, s))).toBe(false);
  });
});
