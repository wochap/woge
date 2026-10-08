import type { ReactNode } from "react";

interface Props {
  compact: boolean;
  /** Options for the active tool; the strip collapses when absent. */
  children?: ReactNode;
}

export function OptionsStrip({ compact, children }: Props) {
  if (!children) return null;
  return (
    <div
      className={compact ? "options-strip compact" : "options-strip"}
      role="toolbar"
      aria-label="Tool options"
    >
      {children}
    </div>
  );
}
