import { useState } from "react";
import type { ObjectType, StrokeWidth } from "../../model/objects";
import type { ColorRole } from "../../model/roles";

const WIDTH_TYPES: ObjectType[] = ["rect", "ellipse", "arrow", "brush", "highlight"];
import { applyStyle, currentRole, currentValue, setColour, type StripContext } from "./apply";
import { OpacitySlider } from "./OpacitySlider";
import { Swatches } from "./Swatches";
import { TargetChips } from "./TargetChips";
import { Segmented, WidthSegmented } from "./WidthSegmented";

/** Swatches for `role`; `chips` reserves the ⊘ slot so the row never changes width. */
export function ColorControl({
  ctx,
  role = "primary",
  chips = false,
}: {
  ctx: StripContext;
  role?: ColorRole;
  chips?: boolean;
}) {
  return (
    <Swatches
      value={currentRole(ctx, role).color}
      secondary={role === "secondary"}
      noneSlot={chips}
      onChange={(c) => setColour(ctx, role, c)}
    />
  );
}

/** Target chips, swatches and opacity for types with a fill or plate. */
export function TargetColorControls({
  ctx,
  labels,
}: {
  ctx: StripContext;
  labels: [string, string];
}) {
  // Strip-local; `AnnotationStrip` remounts on a kind change, resetting to primary.
  const [role, setRole] = useState<ColorRole>("primary");
  return (
    <>
      <TargetChips
        labels={labels}
        value={role}
        primary={currentRole(ctx, "primary")}
        secondary={currentRole(ctx, "secondary")}
        onChange={setRole}
      />
      <ColorControl ctx={ctx} role={role} chips />
      <OpacitySlider ctx={ctx} role={role} />
    </>
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
      <TargetColorControls ctx={ctx} labels={["Border", "Fill"]} />
      <WidthControl ctx={ctx} />
    </>
  );
}

export const RectStrip = BoxStrip;
export const EllipseStrip = BoxStrip;

export function ArrowStrip({ ctx }: { ctx: StripContext }) {
  return (
    <>
      <ColorControl ctx={ctx} />
      <OpacitySlider ctx={ctx} role="primary" />
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
