import { useEditor } from "../../store/editor";
import { snapInt } from "../../model/geometry";
import { rotatedDims } from "../../model/document";
import { setCropPreset } from "../mode";
import { CROP_PRESETS } from "./math";

export function CropStrip() {
  const preset = useEditor((s) => s.cropPreset);
  const draft = useEditor((s) => s.cropDraft);
  const doc = useEditor((s) => s.document);
  const r = draft ? snapInt(draft) : doc ? { ...rotatedDims(doc) } : null;
  return (
    <>
      <div className="segmented" role="radiogroup" aria-label="Aspect">
        {CROP_PRESETS.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={preset === p.id}
            className={preset === p.id ? "seg active" : "seg"}
            onClick={() => setCropPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {r && (
        <span className="strip-readout" data-testid="crop-readout">
          {r.w} × {r.h}
        </span>
      )}
      <span className="strip-hint">Shift: square · Enter apply · Esc cancel</span>
    </>
  );
}
