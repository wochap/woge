import { Group, Image as KonvaImage } from "react-konva";
import type { Document } from "../model/document";

interface Props {
  doc: Document;
  bitmap: ImageBitmap;
}

/** Placement of the rotated base bitmap inside rotated-image space. */
export function imagePlacement(doc: Document) {
  const { width: w, height: h } = doc.source;
  switch (doc.rotation) {
    case 90:
      return { x: h, y: 0 };
    case 180:
      return { x: w, y: h };
    case 270:
      return { x: 0, y: w };
    default:
      return { x: 0, y: 0 };
  }
}

/** Document transform: base → rotate → crop → scale to `size`. Objects share it. */
export function groupAttrs(doc: Document) {
  const { crop, size } = doc;
  return {
    offsetX: crop.x,
    offsetY: crop.y,
    scaleX: size.w / crop.w,
    scaleY: size.h / crop.h,
    clipX: crop.x,
    clipY: crop.y,
    clipWidth: crop.w,
    clipHeight: crop.h,
  };
}

export function imageAttrs(doc: Document) {
  return {
    width: doc.source.width,
    height: doc.source.height,
    rotation: doc.rotation,
    ...imagePlacement(doc),
  };
}

/**
 * The document as Konva nodes. Export (`lib/export.ts`) builds the same nodes from
 * `groupAttrs`/`imageAttrs` on an offscreen stage without the viewport transform.
 */
export function DocumentGroup({ doc, bitmap }: Props) {
  return (
    <Group {...groupAttrs(doc)}>
      <KonvaImage image={bitmap} {...imageAttrs(doc)} />
      <Group name="objects" />
    </Group>
  );
}
