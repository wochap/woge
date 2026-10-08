import { useCallback, useRef } from "react";
import { Group, Rect as KRect, Text } from "react-konva";
import type Konva from "konva";
import type { Dims } from "../../model/document";
import { clampSide, resizeFromHandle } from "../../model/geometry";
import { useEditor } from "../../store/editor";
import { Handles, cssVar, useHandles, type DragInfo } from "../../canvas/useHandles";
import { originalSize } from "./math";

/** Resize mode overlay, drawn in output space on the `ui` layer. */
export function ResizeOverlay() {
  const doc = useEditor((s) => s.document);
  const size = useEditor((s) => s.resizeDraft);
  const scale = useEditor((s) => s.viewport.scale);
  const start = useRef<Dims>({ w: 1, h: 1 });

  const onDrag = useCallback((d: DragInfo) => {
    const s = useEditor.getState();
    if (!s.document || d.handle === "body" || d.handle === "draw") return;
    const orig = originalSize(s.document);
    const lock = s.resizeLock !== d.shift ? orig.w / orig.h : false;
    const r = resizeFromHandle({ x: 0, y: 0, ...start.current }, d.handle, d.delta, {
      lockAspect: lock,
      fromCenter: d.alt,
    });
    let w = clampSide(r.w);
    let h = clampSide(r.h);
    if (lock) {
      // Round the leading dimension, derive the other so 1536 gives 864 exactly.
      if (Math.abs(r.w - start.current.w) * orig.h >= Math.abs(r.h - start.current.h) * orig.w)
        h = clampSide((w * orig.h) / orig.w);
      else w = clampSide((h * orig.w) / orig.h);
    }
    useEditor.setState({ resizeDraft: { w, h } });
  }, []);
  const begin = useHandles(onDrag);

  if (!doc || !size) return null;
  const orig = originalSize(doc);
  const accent = cssVar("--accent") || "#cba6f7";
  const text = cssVar("--text") || "#cdd6f4";
  const muted = cssVar("--overlay0") || cssVar("--subtext") || "#6c7086";
  const down = (h: DragInfo["handle"], e: Konva.KonvaEventObject<PointerEvent>) => {
    start.current = { ...useEditor.getState().resizeDraft! };
    begin(h, e);
  };
  const fs = 11 / scale;
  const label = `${size.w} × ${size.h}`;
  return (
    <Group>
      <KRect
        width={size.w}
        height={size.h}
        stroke={accent}
        strokeWidth={1 / scale}
        listening={false}
      />
      <Handles rect={{ x: 0, y: 0, ...size }} scale={scale} onDown={(h, e) => down(h, e)} />
      <Text
        y={-20 / scale}
        text={label}
        fontSize={fs}
        fontFamily="monospace"
        fill={text}
        listening={false}
      />
      <Text
        x={(label.length + 1) * fs * 0.6}
        y={-20 / scale}
        text={`${orig.w} × ${orig.h}`}
        fontSize={fs}
        fontFamily="monospace"
        fill={muted}
        listening={false}
      />
    </Group>
  );
}
