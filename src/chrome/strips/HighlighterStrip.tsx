import type { StripContext } from "./apply";
import { ColorControl, WidthControl } from "./ShapeStrips";

export function HighlighterStrip({ ctx }: { ctx: StripContext }) {
  return (
    <>
      <ColorControl ctx={ctx} />
      <WidthControl ctx={ctx} />
      <span className="strip-readout mono">50% · multiply</span>
    </>
  );
}
