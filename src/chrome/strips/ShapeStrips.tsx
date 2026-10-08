import type { ColorKey, ObjectType, StrokeWidth } from "../../model/objects";

const WIDTH_TYPES: ObjectType[] = ["rect", "ellipse", "arrow", "brush", "highlight"];
import { applyStyle, currentValue, type StripContext } from "./apply";
import { Swatches } from "./Swatches";
import { Segmented, Toggle, WidthSegmented } from "./WidthSegmented";

export function ColorControl({ ctx }: { ctx: StripContext }) {
  return (
    <Swatches
      value={currentValue(ctx, "stroke") as ColorKey | undefined}
      onChange={(c) => applyStyle(ctx, { stroke: c })}
    />
  );
}

export function WidthControl({ ctx }: { ctx: StripContext }) {
  return (
    <WidthSegmented
      value={currentValue(ctx, "strokeWidth") as StrokeWidth | undefined}
      onChange={(v) => applyStyle(ctx, { strokeWidth: v })}
    />
  );
}

function BoxStrip({ ctx }: { ctx: StripContext }) {
  return (
    <>
      <ColorControl ctx={ctx} />
      <WidthControl ctx={ctx} />
      <Toggle
        label="Fill"
        on={!!currentValue(ctx, "fill")}
        onChange={(v) => applyStyle(ctx, { fill: v })}
      />
    </>
  );
}

export const RectStrip = BoxStrip;
export const EllipseStrip = BoxStrip;

export function ArrowStrip({ ctx }: { ctx: StripContext }) {
  return (
    <>
      <ColorControl ctx={ctx} />
      <WidthControl ctx={ctx} />
      <Segmented
        label="Heads"
        options={[
          { id: "end", label: "End" },
          { id: "both", label: "Both" },
        ]}
        value={currentValue(ctx, "heads")}
        onChange={(v) => applyStyle(ctx, { heads: v })}
      />
    </>
  );
}

/** Mixed selection: only controls every selected type shares. */
export function MixedStrip({ ctx }: { ctx: StripContext }) {
  return (
    <>
      {!ctx.types.includes("redact") && <ColorControl ctx={ctx} />}
      {ctx.types.every((t) => WIDTH_TYPES.includes(t)) && <WidthControl ctx={ctx} />}
    </>
  );
}
