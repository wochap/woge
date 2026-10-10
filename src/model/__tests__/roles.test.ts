import { describe, expect, it } from "vitest";
import { roleFields } from "../roles";
import type { ObjectType } from "../objects";

describe("roleFields", () => {
  it("maps every type", () => {
    const table: [ObjectType, unknown, unknown][] = [
      [
        "rect",
        { color: "stroke", opacity: "strokeOpacity" },
        { color: "fill", opacity: "fillOpacity" },
      ],
      [
        "ellipse",
        { color: "stroke", opacity: "strokeOpacity" },
        { color: "fill", opacity: "fillOpacity" },
      ],
      ["arrow", { color: "stroke", opacity: "strokeOpacity" }, undefined],
      ["brush", { color: "stroke", opacity: "strokeOpacity" }, undefined],
      ["highlight", { color: "stroke", opacity: "strokeOpacity" }, undefined],
      [
        "text",
        { color: "color", opacity: "colorOpacity" },
        { color: "plate", opacity: "plateOpacity" },
      ],
      ["badge", { color: "color" }, undefined],
      ["redact", undefined, undefined],
    ];
    for (const [t, p, s] of table) {
      expect(roleFields(t, "primary")).toEqual(p);
      expect(roleFields(t, "secondary")).toEqual(s);
    }
  });
});
