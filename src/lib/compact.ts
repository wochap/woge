import { useEffect, useState } from "react";

export const COMPACT_W = 960;
export const COMPACT_H = 600;

export interface CompactRules {
  /** <960 wide: truncate name, fold Fit/100% into the menu, icon-only Save as, scrolling strip. */
  narrow: boolean;
  /** <600 tall: Undo/Redo move to the top bar. */
  short: boolean;
}

export function compactRules(width: number, height: number): CompactRules {
  return { narrow: width < COMPACT_W, short: height < COMPACT_H };
}

export function useViewportSize() {
  const [size, setSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

export function useCompact(): CompactRules {
  const { width, height } = useViewportSize();
  return compactRules(width, height);
}
