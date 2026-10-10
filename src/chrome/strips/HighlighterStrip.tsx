import type { StripContext } from "./apply";
import { ColorControl, WidthControl } from "./ShapeStrips";
import { OpacitySlider } from "./OpacitySlider";

/** Multiply blending stays implicit. */
export function HighlighterStrip({ ctx }: { ctx: StripContext }) {
  return (
    <>
      <ColorControl ctx={ctx} />
      <OpacitySlider ctx={ctx} role="primary" />
      <WidthControl ctx={ctx} />
    </>
  );
}
