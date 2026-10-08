import type { BadgeSize } from "../../model/objects";
import { useEditor } from "../../store/editor";
import { applyStyle, currentValue, type StripContext } from "./apply";
import { ColorControl } from "./ShapeStrips";
import { Segmented } from "./WidthSegmented";

const SIZES: { id: BadgeSize; label: string }[] = [
  { id: "S", label: "S" },
  { id: "M", label: "M" },
  { id: "L", label: "L" },
];

export function BadgeStrip({ ctx }: { ctx: StripContext }) {
  // Re-render when the document or counter changes.
  useEditor((s) => s.document);
  useEditor((s) => s.badgeCounter);
  const next = useEditor.getState().nextBadgeNumber();
  return (
    <>
      <ColorControl ctx={ctx} />
      <Segmented
        label="Size"
        options={SIZES}
        value={currentValue(ctx, "size") as BadgeSize | undefined}
        onChange={(v) => applyStyle(ctx, { size: v })}
      />
      <span className="strip-readout mono" data-testid="badge-next">
        Next: {next}
      </span>
      <button className="strip-btn" onClick={() => useEditor.getState().resetBadgeCounter()}>
        Reset
      </button>
    </>
  );
}
