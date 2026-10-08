import { filterFonts } from "../fonts";

it("filters case-insensitively by substring", () => {
  const fonts = ["Inter Variable", "JetBrains Mono Variable", "DejaVu Sans Mono", "Noto Sans"];
  expect(filterFonts(fonts, "mono")).toEqual(["JetBrains Mono Variable", "DejaVu Sans Mono"]);
  expect(filterFonts(fonts, "  ")).toEqual(fonts);
});
