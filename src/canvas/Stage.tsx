import { useEffect, useRef, type ReactNode } from "react";
import Konva from "konva";
import { Image as KonvaImage, Layer, Stage as KonvaStage } from "react-konva";
import { useEditor } from "../store/editor";
import { useNavigation } from "./useNavigation";

Konva.pixelRatio = window.devicePixelRatio || 1;

interface Props {
  checkerboard: boolean;
  /** Rendered over the stage (empty state, drop highlight). */
  children?: ReactNode;
}

export function Stage({ checkerboard, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const doc = useEditor((s) => s.document);
  const view = useEditor((s) => s.viewport);
  const size = useEditor((s) => s.canvasSize);
  const setCanvasSize = useEditor((s) => s.setCanvasSize);
  const { panReady, panning } = useNavigation(ref);

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
        >
          <Layer name="image" listening={false} imageSmoothingEnabled={view.scale < 1}>
            <KonvaImage image={doc.base} width={doc.width} height={doc.height} />
          </Layer>
          <Layer name="objects" />
          <Layer name="ui" />
        </KonvaStage>
      )}
      {children}
    </div>
  );
}
