import { cloneElement, useEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";

const DELAY_MS = 450;

interface Props {
  label: string;
  shortcut?: string;
  side?: "right" | "bottom";
  /** Single focusable child; wrapped so disabled buttons still show the tooltip. */
  children: ReactElement;
}

export function Tooltip({ label, shortcut, side = "bottom", children }: Props) {
  const anchor = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = anchor.current?.getBoundingClientRect();
      if (!r) return;
      setPos(
        side === "right"
          ? { left: r.right + 6, top: r.top + r.height / 2 - 13 }
          : {
              left: Math.max(4, Math.min(r.left + r.width / 2 - 60, window.innerWidth - 200)),
              top: r.bottom + 6,
            },
      );
    }, DELAY_MS);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setPos(null);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <span
      ref={anchor}
      className="tooltip-anchor"
      onPointerEnter={show}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={show}
      onBlur={hide}
    >
      {cloneElement(children as ReactElement<{ "aria-label"?: string }>, { "aria-label": label })}
      {pos &&
        createPortal(
          <div role="tooltip" className="tooltip" style={pos}>
            {label}
            {shortcut && <kbd>{shortcut}</kbd>}
          </div>,
          document.body,
        )}
    </span>
  );
}
