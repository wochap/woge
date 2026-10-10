import { applyStyle, currentValue, type StripContext } from "./apply";
import { ColorControl, WidthControl } from "./ShapeStrips";
import { Toggle } from "./WidthSegmented";
import { OpacitySlider } from "./OpacitySlider";

export function BrushStrip({ ctx }: { ctx: StripContext }) {
  return (
    <>
      <ColorControl ctx={ctx} />
      <OpacitySlider ctx={ctx} role="primary" />
      <WidthControl ctx={ctx} />
      <Toggle
        label="Smooth"
        on={!!currentValue(ctx, "smooth")}
        onChange={(v) => applyStyle(ctx, { smooth: v })}
      />
    </>
  );
}
