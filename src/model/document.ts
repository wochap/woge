export type Rotation = 0 | 90 | 180 | 270;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Dims {
  w: number;
  h: number;
}

/** Placeholder until annotation tools land; positioned in rotated-image space. */
export interface AnnotationObject {
  id: string;
  kind: string;
  x: number;
  y: number;
  [key: string]: unknown;
}

export interface DocumentSource {
  /** null for stdin/clipboard inputs (no Save in place). */
  path: string | null;
  name: string;
  /** Base bitmap dimensions. */
  width: number;
  height: number;
}

/** Serialisable, pixel-free editor document. The bitmap lives in the store. */
export interface Document {
  source: DocumentSource;
  rotation: Rotation;
  /** In rotated-image space, integer pixels. */
  crop: Rect;
  /** Output size; defaults to the crop dimensions. */
  size: Dims;
  objects: AnnotationObject[];
}

export function newDocument(source: DocumentSource): Document {
  return {
    source,
    rotation: 0,
    crop: { x: 0, y: 0, w: source.width, h: source.height },
    size: { w: source.width, h: source.height },
    objects: [],
  };
}

/** Dimensions of the base bitmap after applying `rotation`, before crop. */
export function rotatedDims(doc: Document): Dims {
  const { width, height } = doc.source;
  return doc.rotation % 180 === 0 ? { w: width, h: height } : { w: height, h: width };
}

/** Displayed (output) size of the document. */
export function visibleSize(doc: Document): Dims {
  return doc.size;
}

/** Output pixels per rotated-image pixel. */
export function scaleFactor(doc: Document): { x: number; y: number } {
  return { x: doc.size.w / doc.crop.w, y: doc.size.h / doc.crop.h };
}
