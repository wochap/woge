import { Minus, Plus, TextB } from "@phosphor-icons/react";
import { clampTextSize } from "../../model/objects";
import { useSettings } from "../../store/settings";
import { ensureFontLoaded } from "../../lib/fonts";
import { applyStyle, currentValue, type StripContext } from "./apply";
import { TargetColorControls } from "./ShapeStrips";
import { FontCombobox } from "./FontCombobox";
import { Toggle } from "./WidthSegmented";

export const SIZE_STEP = 2;

/** Step every target's size (or the default) by `dir`. */
export function stepTextSize(ctx: StripContext, dir: 1 | -1) {
  const cur =
    (currentValue(ctx, "size") as number | undefined) ?? useSettings.getState().tools.text.size;
  const size = clampTextSize(cur + dir * SIZE_STEP);
  applyStyle(ctx, { size });
}

export function TextStrip({ ctx }: { ctx: StripContext }) {
  const recent = useSettings((s) => s.recentFonts);
  const size = currentValue(ctx, "size") as number | undefined;
  return (
    <>
      <TargetColorControls ctx={ctx} labels={["Text", "Plate"]} />
      <FontCombobox
        value={currentValue(ctx, "font") as string | undefined}
        recent={recent}
        onChange={(font) => {
          useSettings.getState().useFont(font);
          ensureFontLoaded(font).then(() => applyStyle(ctx, { font }));
        }}
      />
      <div className="size-stepper" aria-label="Size">
        <button aria-label="Smaller" onClick={() => stepTextSize(ctx, -1)}>
          <Minus size={12} />
        </button>
        <input
          aria-label="Font size"
          type="number"
          min={8}
          max={200}
          value={size ?? ""}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n > 0) applyStyle(ctx, { size: clampTextSize(n) });
          }}
        />
        <button aria-label="Larger" onClick={() => stepTextSize(ctx, 1)}>
          <Plus size={12} />
        </button>
      </div>
      <Toggle
        label="Bold"
        on={!!currentValue(ctx, "bold")}
        onChange={(v) => applyStyle(ctx, { bold: v })}
      >
        <TextB size={14} weight="bold" />
      </Toggle>
    </>
  );
}
