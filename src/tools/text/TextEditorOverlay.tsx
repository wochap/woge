import { useEffect, useLayoutEffect, useRef } from "react";
import { useEditor } from "../../store/editor";
import { TEXT_LINE_HEIGHT, resolveColor } from "../../model/objects";
import { cancelText, commitText, editedText, textOverlayPosition } from "./editing";
import { useFlavour } from "../../canvas/ObjectsLayer";
import { ensureFontLoaded } from "../../lib/fonts";

/** HTML textarea over the edited text, matching font, size, colour and on-screen scale. */
export function TextEditorOverlay() {
  const editing = useEditor((s) => s.editingText);
  const doc = useEditor((s) => s.document);
  const view = useEditor((s) => s.viewport);
  useEditor((s) => s.drawing);
  const flavour = useFlavour();
  const ref = useRef<HTMLTextAreaElement>(null);
  const done = useRef(false);
  const obj = editing ? editedText() : null;

  useEffect(() => {
    done.current = false;
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  useEffect(() => {
    if (obj) ensureFontLoaded(obj.font, obj.bold);
  }, [obj?.font, obj?.bold]);

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
    if (!obj?.w) {
      el.style.width = "0px";
      el.style.width = `${el.scrollWidth + 4}px`;
    }
  };
  useLayoutEffect(grow);

  if (!obj || !doc) return null;
  const pos = textOverlayPosition(doc, view, obj);
  const finish = (commit: boolean) => {
    if (done.current) return;
    done.current = true;
    if (commit) commitText(ref.current?.value ?? "");
    else cancelText();
  };

  return (
    <textarea
      ref={ref}
      className="text-editor"
      data-testid="text-editor"
      defaultValue={obj.text}
      spellCheck={false}
      onInput={grow}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          finish(false);
        } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          finish(true);
        }
      }}
      style={{
        position: "absolute",
        left: pos.left,
        top: pos.top,
        transform: `scale(${pos.scale})`,
        transformOrigin: "0 0",
        font: `${obj.bold ? "bold " : ""}${obj.size}px "${obj.font}"`,
        lineHeight: TEXT_LINE_HEIGHT,
        color: resolveColor(obj.color, flavour),
        width: obj.w,
        minWidth: obj.size,
        padding: 0,
        margin: 0,
        border: "none",
        outline: "none",
        background: "transparent",
        resize: "none",
        overflow: "hidden",
        whiteSpace: obj.w ? "pre-wrap" : "pre",
        caretColor: "currentColor",
      }}
    />
  );
}
