import { useEditor } from "../../store/editor";
import { useSettings } from "../../store/settings";
import { stripContext, type StripContext } from "./apply";
import { ArrowStrip, EllipseStrip, MixedStrip, RectStrip } from "./ShapeStrips";
import { TextStrip } from "./TextStrip";
import { BrushStrip } from "./BrushStrip";
import { HighlighterStrip } from "./HighlighterStrip";
import { RedactStrip } from "./RedactStrip";
import { BadgeStrip } from "./BadgeStrip";

/** Strip for the active drawing tool, or for the selection's type in Select. */
export function useAnnotationStrip() {
  const tool = useEditor((s) => s.activeTool);
  const selection = useEditor((s) => s.selection);
  const objects = useEditor((s) => s.document?.objects ?? null);
  useSettings((s) => s.tools);
  if (!objects) return null;
  const ctx = stripContext(tool, selection, objects);
  if (!ctx) return null;
  return <KindStrip key={ctx.kind} ctx={ctx} />;
}

function KindStrip({ ctx }: { ctx: StripContext }) {
  switch (ctx.kind) {
    case "rect":
      return <RectStrip ctx={ctx} />;
    case "ellipse":
      return <EllipseStrip ctx={ctx} />;
    case "arrow":
      return <ArrowStrip ctx={ctx} />;
    case "text":
      return <TextStrip ctx={ctx} />;
    case "brush":
      return <BrushStrip ctx={ctx} />;
    case "highlight":
      return <HighlighterStrip ctx={ctx} />;
    case "redact":
      return <RedactStrip ctx={ctx} />;
    case "badge":
      return <BadgeStrip ctx={ctx} />;
    default:
      return <MixedStrip ctx={ctx} />;
  }
}
