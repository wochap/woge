import { Group, Image as KonvaImage } from "react-konva";
import type { Document } from "../model/document";

interface Props {
  doc: Document;
  bitmap: ImageBitmap;
}

/** Placement of the rotated base bitmap inside rotated-image space. */
function imagePlacement(doc: Document) {
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

/**
 * Document transform: base → rotate → crop → scale to `size`. Objects share it.
 * Export reuses this group on an offscreen stage without the viewport transform.
 */
export function DocumentGroup({ doc, bitmap }: Props) {
  const { crop, size } = doc;
  return (
    <Group
      offsetX={crop.x}
      offsetY={crop.y}
      scaleX={size.w / crop.w}
      scaleY={size.h / crop.h}
      clipX={crop.x}
      clipY={crop.y}
      clipWidth={crop.w}
      clipHeight={crop.h}
    >
      <KonvaImage
        image={bitmap}
        width={doc.source.width}
        height={doc.source.height}
        rotation={doc.rotation}
        {...imagePlacement(doc)}
      />
      <Group name="objects" />
    </Group>
  );
}
