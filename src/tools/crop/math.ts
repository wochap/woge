import type { Document, Rect } from "../../model/document";
import { rotatedDims } from "../../model/document";
import { clampRect, snapInt } from "../../model/geometry";

export type CropPreset = "free" | "1:1" | "4:3" | "16:9";
export const CROP_PRESETS: { id: CropPreset; label: string; ratio: number | null }[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
];

export function presetRatio(p: CropPreset): number | null {
  return CROP_PRESETS.find((c) => c.id === p)!.ratio;
}

/** Commit `rect` as the crop, keeping any prior resize ratio. */
export function applyCrop(doc: Document, rect: Rect): Document {
  const crop = clampRect(snapInt(rect), rotatedDims(doc));
  const rx = doc.size.w / doc.crop.w;
  const ry = doc.size.h / doc.crop.h;
  return {
    ...doc,
    crop,
    size: { w: Math.max(1, Math.round(crop.w * rx)), h: Math.max(1, Math.round(crop.h * ry)) },
  };
}

export function formatCropStatus(r: Rect): string {
  const s = snapInt(r);
  return `crop ${s.w} × ${s.h} @ ${s.x},${s.y}`;
}
