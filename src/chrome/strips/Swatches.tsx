import { COLOR_NAMES, SWATCHES, needsRim, swatchDigit, type ColorKey } from "../../model/palette";
import { resolveColor } from "../../model/objects";
import { useFlavour } from "../../canvas/ObjectsLayer";

interface Props {
  value: ColorKey | null | undefined;
  onChange(c: ColorKey | null): void;
  /** Fill/plate target: tooltips read "⇧2" and the ⊘ slot is live. */
  secondary?: boolean;
  /** Reserve the leading ⊘ slot (strips with target chips). */
  noneSlot?: boolean;
}

/** Ten annotation colours; the chosen one is ringed in `--accent`. */
export function Swatches({ value, onChange, secondary = false, noneSlot = false }: Props) {
  const flavour = useFlavour();
  return (
    <div className="swatches" role="radiogroup" aria-label="Colour">
      {noneSlot && (
        <button
          role="radio"
          aria-checked={secondary && value === null}
          aria-label="None"
          aria-hidden={!secondary}
          tabIndex={secondary ? 0 : -1}
          disabled={!secondary}
          title="None"
          className={["swatch swatch-none", secondary && value === null && "active"]
            .filter(Boolean)
            .join(" ")}
          style={{ visibility: secondary ? "visible" : "hidden" }}
          onClick={() => onChange(null)}
        >
          ⊘
        </button>
      )}
      {SWATCHES.map((c) => {
        const tip = `${COLOR_NAMES[c]} ${secondary ? "⇧" : ""}${swatchDigit(c)}`;
        return (
          <button
            key={c}
            role="radio"
            aria-checked={value === c}
            aria-label={c}
            title={tip}
            className={["swatch", value === c && "active", needsRim(c, flavour) && "rim"]
              .filter(Boolean)
              .join(" ")}
            style={{ background: resolveColor(c, flavour) }}
            onClick={() => onChange(c)}
          />
        );
      })}
    </div>
  );
}
