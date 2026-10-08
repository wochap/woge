import { BLUR_RANGE, PIXELATE_RANGE, clampStrength, type RedactMode } from "../../model/objects";
import { applyStyle, currentValue, type StripContext } from "./apply";
import { Segmented } from "./WidthSegmented";

export function RedactStrip({ ctx }: { ctx: StripContext }) {
  const mode = currentValue(ctx, "mode") as RedactMode | undefined;
  const strength = currentValue(ctx, "strength") as number | undefined;
  const range = mode === "blur" ? BLUR_RANGE : PIXELATE_RANGE;
  return (
    <>
      <Segmented
        label="Mode"
        options={[
          { id: "pixelate", label: "Pixelate" },
          { id: "blur", label: "Blur" },
        ]}
        value={mode}
        onChange={(m) =>
          applyStyle(ctx, { mode: m, strength: clampStrength(m, strength ?? range.default) })
        }
      />
      <input
        type="range"
        aria-label="Strength"
        className="strip-slider"
        min={range.min}
        max={range.max}
        value={strength ?? range.default}
        onChange={(e) =>
          applyStyle(ctx, { strength: clampStrength(mode ?? "pixelate", Number(e.target.value)) })
        }
      />
      <span className="strip-readout mono">
        {strength === undefined ? "–" : mode === "blur" ? `${strength}` : `${strength} px`}
      </span>
      <span className="strip-hint">Pixelate is safer</span>
    </>
  );
}
