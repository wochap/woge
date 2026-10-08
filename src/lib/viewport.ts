export interface View {
  x: number;
  y: number;
  scale: number;
}
export interface Size {
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 32;
export const ZOOM_STEP = 1.25;
export const FIT_PADDING = 24;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Fit the image inside the canvas minus padding, centred, never above 100%. */
export function fitTransform(image: Size, canvas: Size, padding = FIT_PADDING): View {
  const availW = Math.max(1, canvas.width - padding * 2);
  const availH = Math.max(1, canvas.height - padding * 2);
  const scale = clampScale(Math.min(1, availW / image.width, availH / image.height));
  return centreAt(image, canvas, scale, { x: image.width / 2, y: image.height / 2 });
}

/** View at `scale` with image point `p` at the canvas centre. */
export function centreAt(_image: Size, canvas: Size, scale: number, p: Point): View {
  return { scale, x: canvas.width / 2 - p.x * scale, y: canvas.height / 2 - p.y * scale };
}

export function screenToImage(view: View, p: Point): Point {
  return { x: (p.x - view.x) / view.scale, y: (p.y - view.y) / view.scale };
}

export function imageToScreen(view: View, p: Point): Point {
  return { x: p.x * view.scale + view.x, y: p.y * view.scale + view.y };
}

/** Multiply zoom by `factor`, keeping the image point under screen `point` fixed. */
export function zoomAround(view: View, factor: number, point: Point): View {
  const scale = clampScale(view.scale * factor);
  const img = screenToImage(view, point);
  return { scale, x: point.x - img.x * scale, y: point.y - img.y * scale };
}

export function zoomToScale(view: View, scale: number, point: Point): View {
  return zoomAround(view, scale / view.scale, point);
}

export function panBy(view: View, dx: number, dy: number): View {
  return { ...view, x: view.x + dx, y: view.y + dy };
}

/** Keep the image point at the old canvas centre at the new canvas centre. */
export function keepCentre(view: View, from: Size, to: Size): View {
  return panBy(view, (to.width - from.width) / 2, (to.height - from.height) / 2);
}

export interface WheelLike {
  deltaX: number;
  deltaY: number;
  ctrlKey: boolean;
  metaKey?: boolean;
  shiftKey: boolean;
}

/** Wheel semantics: Ctrl zooms around the pointer, Shift+vertical pans horizontally, else pans. */
export function applyWheel(view: View, e: WheelLike, pointer: Point): View {
  if (e.ctrlKey || e.metaKey) return zoomAround(view, Math.exp(-e.deltaY * 0.01), pointer);
  if (e.shiftKey && e.deltaX === 0) return panBy(view, -e.deltaY, 0);
  return panBy(view, -e.deltaX, -e.deltaY);
}

export function zoomPercent(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}
