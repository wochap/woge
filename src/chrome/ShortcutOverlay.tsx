import { useEffect, useState } from "react";
import { COLUMNS, KEYMAP } from "../lib/keys";
import { SWATCHES, needsRim, swatchDigit } from "../model/palette";
import { resolveColor } from "../model/objects";
import { useFlavour } from "../canvas/ObjectsLayer";

/** Below this window width the four columns wrap into two per row. */
export const OVERLAY_WIDE_MIN = 1160;

function useWide(): boolean {
  const [wide, setWide] = useState(() => window.innerWidth >= OVERLAY_WIDE_MIN);
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= OVERLAY_WIDE_MIN);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return wide;
}

export function ShortcutOverlay({ onClose }: { onClose(): void }) {
  const wide = useWide();
  const flavour = useFlavour();
  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onPointerDown={onClose}
    >
      <div className="overlay-panel" onPointerDown={(e) => e.stopPropagation()}>
        <div className="overlay-head">
          <span className="overlay-title">Keyboard shortcuts</span>
          <span className="overlay-hint">
            Press <kbd>?</kbd> or <kbd>Esc</kbd> to close
          </span>
        </div>
        <div className="overlay-body" data-testid="overlay-body">
          <div className={wide ? "overlay-cols" : "overlay-cols two-col"}>
            {COLUMNS.map((col) => (
              <div key={col.id} className="overlay-col">
                <div className="overlay-col-title">{col.title}</div>
                {KEYMAP.filter((k) => k.column === col.id).map((k) => (
                  <div key={k.id} className="overlay-row">
                    <span>{k.label}</span>
                    <kbd>{k.display}</kbd>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="overlay-colour-keys" aria-label="Colour keys">
            {SWATCHES.map((c) => (
              <span key={c} className="overlay-colour-key">
                <kbd>{swatchDigit(c)}</kbd>
                <span
                  className={needsRim(c, flavour) ? "swatch rim" : "swatch"}
                  style={{ background: resolveColor(c, flavour) }}
                />
              </span>
            ))}
            <span className="overlay-hint">Hold ⇧ for fill / plate</span>
          </div>
        </div>
      </div>
    </div>
  );
}
