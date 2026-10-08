import Konva from "konva";
import { groupAttrs, imageAttrs } from "../canvas/DocumentGroup";
import { rotatedDims, type Document } from "../model/document";
import { buildObjectNodes, currentFlavour } from "../canvas/objectNodes";
import type { Flavour } from "./theme";
import type { Format } from "./backend";

export const MIME: Record<Format, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const EXT: Record<Format, string> = { png: "png", jpeg: "jpg", webp: "webp" };

export const WEBP_UNSUPPORTED = "WebP not supported here, saved as PNG";
const LARGE_PX = 64_000_000;

export function formatFromExt(ext: string | null | undefined): Format | null {
  switch (ext?.toLowerCase()) {
    case "png":
      return "png";
    case "jpg":
    case "jpeg":
      return "jpeg";
    case "webp":
      return "webp";
    default:
      return null;
  }
}

export function extOf(path: string): string | null {
  const name = path.split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1) : null;
}

/** Explicit (flag/-o/config) > source extension > PNG. */
export function resolveFormat(explicit: Format | null, sourcePath: string | null): Format {
  return explicit ?? formatFromExt(sourcePath ? extOf(sourcePath) : null) ?? "png";
}

/** Keep a matching extension, replace another image extension, append otherwise. */
export function rewriteExtension(path: string, format: Format): string {
  const ext = extOf(path);
  const current = formatFromExt(ext);
  if (current === format) return path;
  if (current) return path.slice(0, -ext!.length) + EXT[format];
  return `${path}.${EXT[format]}`;
}

export interface Exported {
  bytes: Uint8Array;
  /** May differ from the request when WebP is unavailable. */
  format: Format;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), type, quality),
  );
}

/** Builds the document nodes on a detached stage of exactly `size`, at pixelRatio 1. */
export function buildExportStage(
  doc: Document,
  bitmap: CanvasImageSource,
  format: Format,
  flavour: Flavour = currentFlavour(),
) {
  const { w, h } = doc.size;
  const container = window.document.createElement("div");
  const stage = new Konva.Stage({ container, width: w, height: h });
  const layer = new Konva.Layer({ listening: false });
  // JPEG has no alpha: flatten onto white.
  if (format === "jpeg")
    layer.add(new Konva.Rect({ x: 0, y: 0, width: w, height: h, fill: "#fff" }));
  const group = new Konva.Group(groupAttrs(doc));
  group.add(new Konva.Image({ image: bitmap, ...imageAttrs(doc) }));
  const objects = new Konva.Group({ name: "objects" });
  const ctx = {
    flavour,
    image: rotatedDims(doc),
    bitmap,
    base: { w: doc.source.width, h: doc.source.height },
    rotation: doc.rotation,
  };
  for (const n of buildObjectNodes(doc.objects, ctx)) objects.add(n as Konva.Shape | Konva.Group);
  group.add(objects);
  layer.add(group);
  stage.add(layer);
  return stage;
}

/**
 * Render and encode independent of viewport zoom, window size and display scale.
 * Falls back to PNG when the webview cannot encode WebP.
 */
export async function exportDocument(
  doc: Document,
  bitmap: CanvasImageSource,
  format: Format,
  quality?: number,
): Promise<Exported> {
  const { w, h } = doc.size;
  if (w * h > LARGE_PX)
    console.warn(`woge: exporting ${w}×${h} (${Math.round((w * h) / 1e6)} Mpx)`);
  const stage = buildExportStage(doc, bitmap, format);
  try {
    const canvas = stage.toCanvas({ x: 0, y: 0, width: w, height: h, pixelRatio: 1 });
    let blob = await toBlob(canvas, MIME[format], format === "png" ? undefined : quality);
    let out = format;
    if (blob.type !== MIME[format]) {
      out = "png";
      if (blob.type !== MIME.png) blob = await toBlob(canvas, MIME.png);
    }
    return { bytes: new Uint8Array(await blob.arrayBuffer()), format: out };
  } finally {
    stage.destroy();
  }
}
