import { applyStyle, currentValue, type StripContext } from "./apply";
import { ColorControl, WidthControl } from "./ShapeStrips";
import { Toggle } from "./WidthSegmented";

export function BrushStrip({ ctx }: { ctx: StripContext }) {
  return (
    <>
      <ColorControl ctx={ctx} />
      <WidthControl ctx={ctx} />
      <Toggle
        label="Smooth"
        on={!!currentValue(ctx, "smooth")}
        onChange={(v) => applyStyle(ctx, { smooth: v })}
      />
    </>
  );
}
