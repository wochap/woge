import { Check, X } from "@phosphor-icons/react";
import type { Size } from "../lib/viewport";

const PAIR_W = 64;
const PAIR_H = 28;
const GAP = 8;

interface Props {
  /** Anchor rect in canvas (screen) coordinates. */
  rect: { x: number; y: number; w: number; h: number };
  canvas: Size;
  onConfirm(): void;
  onCancel(): void;
}

/** Place the pair below the rect's bottom-right, flipping inside when it would leave the canvas. */
export function confirmPosition(rect: Props["rect"], canvas: Size): { left: number; top: number } {
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;
  let left = right - PAIR_W;
  let top = bottom + GAP;
  if (top + PAIR_H > canvas.height) top = bottom - PAIR_H - GAP;
  if (right > canvas.width) left = canvas.width - PAIR_W - GAP;
  return { left: Math.max(GAP, left), top: Math.max(GAP, top) };
}

export function FloatingConfirm({ rect, canvas, onConfirm, onCancel }: Props) {
  const pos = confirmPosition(rect, canvas);
  return (
    <div className="floating-confirm" style={pos}>
      <button className="btn btn-ghost btn-icon" aria-label="Cancel (Esc)" onClick={onCancel}>
        <X size={14} />
      </button>
      <button className="btn btn-primary btn-icon" aria-label="Apply (Enter)" onClick={onConfirm}>
        <Check size={14} />
      </button>
    </div>
  );
}
