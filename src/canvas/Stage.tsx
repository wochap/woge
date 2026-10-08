import { useEffect, useRef, useState, type ReactNode } from "react";
import Konva from "konva";
import { Group, Layer, Rect as KRect, Stage as KonvaStage } from "react-konva";
import { useEditor } from "../store/editor";
import { useNavigation } from "./useNavigation";
import { DocumentGroup, groupAttrs } from "./DocumentGroup";
import { ObjectsLayer } from "./ObjectsLayer";
import { OBJECTS_ROOT } from "./pointer";
import { SelectionTransformer } from "../tools/select/SelectionTransformer";
import { ArrowHandles } from "../tools/select/ArrowHandles";
import { useSelectTool } from "../tools/select/useSelectTool";
import { useShapeTool } from "../tools/shapes/useShapeTool";
import { TextEditorOverlay } from "../tools/text/TextEditorOverlay";
import { BadgeEditorOverlay } from "../tools/badge/BadgeEditorOverlay";
import { DRAFT_GROUP } from "../tools/freehand/useFreehandTool";
import { cssVar } from "./useHandles";
import { rotatedDims, type Document, type Rect } from "../model/document";
import { imageToScreen } from "../lib/viewport";
import { CropOverlay } from "../tools/crop/CropOverlay";
import { ResizeOverlay } from "../tools/resize/ResizeOverlay";
import { FloatingConfirm } from "../chrome/FloatingConfirm";
import { cancelMode, confirmMode } from "../tools/mode";

Konva.pixelRatio = window.devicePixelRatio || 1;
Konva.dragDistance = 3;

interface Props {
  checkerboard: boolean;
  /** Rendered over the stage (empty state, drop highlight). */
  children?: ReactNode;
}

export function Stage({ checkerboard, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const doc = useEditor((s) => s.document);
  const bitmap = useEditor((s) => s.bitmap);
  const mode = useEditor((s) => s.mode);
  const cropDraft = useEditor((s) => s.cropDraft);
  const resizeDraft = useEditor((s) => s.resizeDraft);
  const view = useEditor((s) => s.viewport);
  const size = useEditor((s) => s.canvasSize);
  const setCanvasSize = useEditor((s) => s.setCanvasSize);
  const { panReady, panning } = useNavigation(ref);
  const tool = useEditor((s) => s.activeTool);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const selectDown = useSelectTool(setMarquee);
  const shapeDown = useShapeTool();
  const onStageDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (mode !== "none" || e.evt.button !== 0) return;
    if (tool === "select") {
      if (e.target === e.target.getStage()) selectDown(e);
    } else shapeDown(e);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setCanvasSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Follow output scale changes (moving between 1x and 2x monitors).
    let mq: MediaQueryList | null = null;
    const onDpr = () => {
      Konva.pixelRatio = window.devicePixelRatio || 1;
      Konva.dragDistance = 3;
      watchDpr();
    };
    const watchDpr = () => {
      mq?.removeEventListener("change", onDpr);
      mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener("change", onDpr);
    };
    if (typeof matchMedia === "function") watchDpr();
    return () => {
      ro.disconnect();
      mq?.removeEventListener("change", onDpr);
    };
  }, [setCanvasSize]);

  // Crop mode shows the whole rotated image unscaled; resize mode previews the draft size.
  let shown: Document | null = doc;
  if (doc && mode === "crop") {
    const full = rotatedDims(doc);
    shown = { ...doc, crop: { x: 0, y: 0, ...full }, size: full };
  } else if (doc && mode === "resize" && resizeDraft) shown = { ...doc, size: resizeDraft };
  const docScale = shown ? shown.size.w / shown.crop.w : 1;

  const anchor =
    mode === "crop"
      ? cropDraft
      : mode === "resize" && resizeDraft
        ? { x: 0, y: 0, ...resizeDraft }
        : null;
  let anchorScreen = null;
  if (anchor) {
    const a = imageToScreen(view, anchor);
    anchorScreen = { x: a.x, y: a.y, w: anchor.w * view.scale, h: anchor.h * view.scale };
  }

  const cls = [
    "canvas-area",
    checkerboard && "checker",
    panning ? "panning" : panReady && doc && "pan-ready",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={cls} data-testid="canvas-area">
      {doc && size.width > 0 && (
        <KonvaStage
          width={size.width}
          height={size.height}
          x={view.x}
          y={view.y}
          scaleX={view.scale}
          scaleY={view.scale}
          listening={!panning}
          onPointerDown={onStageDown}
        >
          <Layer
            name="document"
            listening={false}
            imageSmoothingEnabled={view.scale * docScale < 1}
          >
            {shown && bitmap && <DocumentGroup doc={shown} bitmap={bitmap} />}
          </Layer>
          <Layer name="objects" listening={mode === "none"}>
            {shown && (
              <Group name={OBJECTS_ROOT} {...groupAttrs(shown)}>
                <ObjectsLayer doc={shown} />
              </Group>
            )}
          </Layer>
          <Layer name="ui">
            {shown && mode === "none" && (
              <Group
                offsetX={shown.crop.x}
                offsetY={shown.crop.y}
                scaleX={docScale}
                scaleY={shown.size.h / shown.crop.h}
              >
                <ArrowHandles docScale={docScale} />
                <Group name={DRAFT_GROUP} listening={false} />
                {marquee && (
                  <KRect
                    x={marquee.x}
                    y={marquee.y}
                    width={marquee.w}
                    height={marquee.h}
                    stroke={cssVar("--accent") || "#cba6f7"}
                    strokeWidth={1 / (view.scale * docScale)}
                    dash={[4 / (view.scale * docScale), 3 / (view.scale * docScale)]}
                    fill="rgba(127,127,127,0.08)"
                    listening={false}
                  />
                )}
              </Group>
            )}
            {mode === "none" && <SelectionTransformer />}
            {mode === "crop" && <CropOverlay />}
            {mode === "resize" && <ResizeOverlay />}
          </Layer>
        </KonvaStage>
      )}
      {anchorScreen && (
        <FloatingConfirm
          rect={anchorScreen}
          canvas={size}
          onConfirm={confirmMode}
          onCancel={cancelMode}
        />
      )}
      {doc && mode === "none" && <TextEditorOverlay />}
      {doc && mode === "none" && <BadgeEditorOverlay />}
      {children}
    </div>
  );
}
