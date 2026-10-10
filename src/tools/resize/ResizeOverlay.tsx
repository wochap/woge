import { useCallback, useRef, useState } from "react";
import { Circle, Group, Path, Rect as KRect, Text } from "react-konva";
import type Konva from "konva";
import type { Rect } from "../../model/document";
import type { Handle } from "../../model/geometry";
import { useEditor } from "../../store/editor";
import { Handles, cssVar, useHandles, type DragInfo } from "../../canvas/useHandles";
import { anchorPoint, dragDraft, originalSize } from "./math";

/** Phosphor PushPin (regular), 256×256 viewbox. */
const PUSH_PIN = "M235.32,81.37,174.63,20.69a16,16,0,0,0-22.63,0L98.37,74.49c-10.66-3.34-35-7.37-60.4,13.14a16,16,0,0,0-1.29,23.78L85,159.71,42.34,202.34a8,8,0,0,0,11.32,11.32L96.29,171l48.29,48.29A16,16,0,0,0,155.9,224c.38,0,.75,0,1.13,0a15.93,15.93,0,0,0,11.64-6.33c19.64-26.1,17.75-47.32,13.19-60L235.33,104A16,16,0,0,0,235.32,81.37ZM224,92.69h0l-57.27,57.46a8,8,0,0,0-1.49,9.22c9.46,18.93-1.8,38.59-9.34,48.62L48,100.08c12.08-9.74,23.64-12.31,32.48-12.31A40.13,40.13,0,0,1,96.81,91a8,8,0,0,0,9.25-1.51L163.32,32,224,92.68Z";

/** Resize mode overlay, drawn in output space on the `ui` layer. */
export function ResizeOverlay() {
  const doc = useEditor((s) => s.document);
  const draft = useEditor((s) => s.resizeDraft);
  const scale = useEditor((s) => s.viewport.scale);
  const dragging = useEditor((s) => s.pointerDrag);
  const start = useRef<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [active, setActive] = useState<{ handle: Handle; alt: boolean } | null>(null);

  const onDrag = useCallback((d: DragInfo) => {
    const s = useEditor.getState();
    if (!s.document || d.handle === "body" || d.handle === "draw") return;
    const lock = s.resizeLock !== d.shift;
    const r = dragDraft(start.current, originalSize(s.document), d.handle, d.delta, lock, d.alt);
    setActive({ handle: d.handle, alt: d.alt });
    useEditor.setState({ resizeDraft: r });
  }, []);
  const begin = useHandles(onDrag);

  if (!doc || !draft) return null;
  const orig = originalSize(doc);
  const accent = cssVar("--accent") || "#cba6f7";
  const text = cssVar("--text") || "#cdd6f4";
  const muted = cssVar("--overlay0") || cssVar("--muted") || "#6c7086";
  const outline = cssVar("--overlay1") || cssVar("--muted") || "#7f849c";
  const down = (h: DragInfo["handle"], e: Konva.KonvaEventObject<PointerEvent>) => {
    start.current = { ...useEditor.getState().resizeDraft! };
    setActive(null);
    begin(h, e);
  };
  const fs = 11 / scale;
  const label = `${draft.w} × ${draft.h}`;
  const changed = draft.w !== doc.size.w || draft.h !== doc.size.h;
  const pin = dragging && active ? anchorPoint(draft, active.handle, active.alt) : null;
  return (
    <Group>
      {changed && (
        <KRect
          width={doc.size.w}
          height={doc.size.h}
          stroke={outline}
          strokeWidth={1 / scale}
          dash={[4 / scale, 4 / scale]}
          listening={false}
        />
      )}
      <KRect
        x={draft.x}
        y={draft.y}
        width={draft.w}
        height={draft.h}
        stroke={accent}
        strokeWidth={1 / scale}
        listening={false}
      />
      <Handles rect={draft} scale={scale} onDown={(h, e) => down(h, e)} />
      <Text
        x={draft.x}
        y={draft.y - 20 / scale}
        text={label}
        fontSize={fs}
        fontFamily="monospace"
        fill={text}
        listening={false}
      />
      <Text
        x={draft.x + (label.length + 1) * fs * 0.6}
        y={draft.y - 20 / scale}
        text={`${orig.w} × ${orig.h}`}
        fontSize={fs}
        fontFamily="monospace"
        fill={muted}
        listening={false}
      />
      {pin && (
        <Group x={pin.x} y={pin.y} listening={false}>
          <Circle radius={3 / scale} fill={accent} />
          <Path
            x={8 / scale}
            y={-fs / 2}
            data={PUSH_PIN}
            scaleX={fs / 256}
            scaleY={fs / 256}
            fill={accent}
          />
          <Text
            x={8 / scale + fs * 1.3}
            y={-fs / 2}
            text="Fixed corner"
            fontSize={fs}
            fill={text}
          />
        </Group>
      )}
    </Group>
  );
}
