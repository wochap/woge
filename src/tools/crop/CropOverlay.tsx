import { useCallback, useRef } from "react";
import { Group, Label, Rect as KRect, Tag, Text } from "react-konva";
import type Konva from "konva";
import { rotatedDims, type Rect } from "../../model/document";
import {
  clampMove,
  clampRect,
  rectFromDrag,
  resizeFromHandle,
  snapInt,
  type Point,
} from "../../model/geometry";
import { useEditor } from "../../store/editor";
import { Handles, cssVar, setCursor, useHandles, type DragInfo } from "../../canvas/useHandles";
import { presetRatio } from "./math";

const HIT = "rgba(0,0,0,0.001)";
const FAR = 1e6;

/** Crop mode overlay, drawn in rotated-image space on the `ui` layer. */
export function CropOverlay() {
  const doc = useEditor((s) => s.document);
  const rect = useEditor((s) => s.cropDraft);
  const scale = useEditor((s) => s.viewport.scale);
  const start = useRef<{ rect: Rect | null; point: Point }>({ rect: null, point: { x: 0, y: 0 } });

  const onDrag = useCallback((d: DragInfo) => {
    const s = useEditor.getState();
    if (!s.document) return;
    const bounds = rotatedDims(s.document);
    const preset = presetRatio(s.cropPreset);
    const r0 = start.current.rect;
    let next: Rect | null = null;
    if (d.handle === "draw") {
      const a = start.current.point;
      const b = { x: a.x + d.delta.x, y: a.y + d.delta.y };
      next = clampRect(rectFromDrag(a, b, preset ?? (d.shift ? 1 : null), d.alt), bounds);
    } else if (d.handle === "body" && r0) {
      next = clampMove({ ...r0, x: r0.x + d.delta.x, y: r0.y + d.delta.y }, bounds);
    } else if (r0 && d.handle !== "body") {
      const lockAspect = preset ?? (d.shift ? 1 : false);
      next = clampRect(
        resizeFromHandle(r0, d.handle, d.delta, { lockAspect, fromCenter: d.alt }),
        bounds,
      );
    }
    if (next) useEditor.setState({ cropDraft: next });
  }, []);
  const onEnd = useCallback(() => {
    const r = useEditor.getState().cropDraft;
    if (r) useEditor.setState({ cropDraft: snapInt(r) });
  }, []);
  const begin = useHandles(onDrag, onEnd);

  if (!doc) return null;
  const { w: W, h: H } = rotatedDims(doc);
  const dim = cssVar("--dim") || "rgba(17,17,27,0.6)";
  const accent = cssVar("--accent") || "#cba6f7";
  const onBg = cssVar("--on-accent") || "#11111b";

  const down = (handle: DragInfo["handle"], e: Konva.KonvaEventObject<PointerEvent>) => {
    const p = e.target.getStage()?.getRelativePointerPosition() ?? { x: 0, y: 0 };
    start.current = { rect: useEditor.getState().cropDraft, point: p };
    begin(handle, e);
  };

  const r = rect;
  const shown = r ? snapInt(r) : null;
  return (
    <Group>
      <KRect
        x={-FAR}
        y={-FAR}
        width={FAR * 2}
        height={FAR * 2}
        fill={HIT}
        onPointerDown={(e) => down("draw", e)}
        onMouseEnter={(e) => setCursor(e, "crosshair")}
        onMouseLeave={(e) => setCursor(e, "")}
      />
      {r ? (
        <>
          <KRect x={0} y={0} width={W} height={r.y} fill={dim} listening={false} />
          <KRect
            x={0}
            y={r.y + r.h}
            width={W}
            height={H - r.y - r.h}
            fill={dim}
            listening={false}
          />
          <KRect x={0} y={r.y} width={r.x} height={r.h} fill={dim} listening={false} />
          <KRect
            x={r.x + r.w}
            y={r.y}
            width={W - r.x - r.w}
            height={r.h}
            fill={dim}
            listening={false}
          />
          <KRect
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={HIT}
            stroke={accent}
            strokeWidth={1 / scale}
            onPointerDown={(e) => down("body", e)}
            onMouseEnter={(e) => setCursor(e, "move")}
            onMouseLeave={(e) => setCursor(e, "")}
          />
          <Handles rect={r} scale={scale} onDown={(h, e) => down(h, e)} />
          <Label x={r.x} y={r.y - 22 / scale} listening={false}>
            <Tag fill={accent} cornerRadius={3 / scale} />
            <Text
              text={`${shown!.w} × ${shown!.h}`}
              fontSize={11 / scale}
              padding={3 / scale}
              fill={onBg}
              fontFamily="monospace"
            />
          </Label>
        </>
      ) : (
        <KRect x={0} y={0} width={W} height={H} fill={dim} listening={false} />
      )}
    </Group>
  );
}
