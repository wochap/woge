import { useRef, useState } from "react";
import type { ColorRole } from "../../model/roles";
import { commitOpacity, currentRole, previewOpacity, setOpacity, type StripContext } from "./apply";

/** 0–100% for `role`; previews while dragging and commits one history entry per gesture. */
export function OpacitySlider({ ctx, role }: { ctx: StripContext; role: ColorRole }) {
  const cur = currentRole(ctx, role);
  const none = role === "secondary" && cur.color === null;
  const [draft, setDraft] = useState<number | null>(null);
  const pending = useRef<number | null>(null);
  const value = draft ?? (cur.opacity === undefined ? null : Math.round(cur.opacity * 100));
  const end = () => {
    const v = pending.current;
    pending.current = null;
    setDraft(null);
    if (v === null) return;
    if (ctx.targets.length) commitOpacity(ctx, role, v / 100);
    else setOpacity(ctx, role, v / 100);
  };
  return (
    <div className="strip-field opacity-field">
      <input
        type="range"
        aria-label="Opacity"
        className="strip-slider"
        min={0}
        max={100}
        disabled={none}
        value={none ? 0 : (value ?? 100)}
        onChange={(e) => {
          const v = Number(e.target.value);
          pending.current = v;
          setDraft(v);
          if (ctx.targets.length) previewOpacity(ctx, role, v / 100);
        }}
        onPointerUp={end}
        onKeyUp={end}
        onBlur={end}
      />
      <span className="strip-readout mono">{none || value === null ? "—" : `${value}%`}</span>
    </div>
  );
}
