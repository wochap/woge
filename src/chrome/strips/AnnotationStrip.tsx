import { useEditor } from "../../store/editor";
import { useSettings } from "../../store/settings";
import { stripContext } from "./apply";
import { ArrowStrip, EllipseStrip, MixedStrip, RectStrip } from "./ShapeStrips";
import { TextStrip } from "./TextStrip";

/** Strip for the active drawing tool, or for the selection's type in Select. */
export function useAnnotationStrip() {
  const tool = useEditor((s) => s.activeTool);
  const selection = useEditor((s) => s.selection);
  const objects = useEditor((s) => s.document?.objects ?? null);
  useSettings((s) => s.tools);
  if (!objects) return null;
  const ctx = stripContext(tool, selection, objects);
  if (!ctx) return null;
  switch (ctx.kind) {
    case "rect":
      return <RectStrip ctx={ctx} />;
    case "ellipse":
      return <EllipseStrip ctx={ctx} />;
    case "arrow":
      return <ArrowStrip ctx={ctx} />;
    case "text":
      return <TextStrip ctx={ctx} />;
    default:
      return <MixedStrip ctx={ctx} />;
  }
}
