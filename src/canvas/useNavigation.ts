import { useEffect, useRef, useState, type RefObject } from "react";
import { useEditor } from "../store/editor";
import { applyWheel, panBy, zoomAround, type Point } from "../lib/viewport";
import { isTextTarget } from "../lib/keys";

function localPoint(el: HTMLElement, e: { clientX: number; clientY: number }): Point {
  const r = el.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

interface GestureEvent extends UIEvent {
  scale: number;
  clientX: number;
  clientY: number;
}

/**
 * Wheel / pinch / Space-drag / middle-drag navigation on the canvas container.
 * Keyboard zoom commands go through the keymap; resize handling lives in the store.
 */
export function useNavigation(ref: RefObject<HTMLElement | null>) {
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const spaceRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const store = useEditor.getState;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!store().document) return;
      // Normalise line/page deltas from mouse wheels to pixels.
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
      const next = applyWheel(
        store().viewport,
        {
          deltaX: e.deltaX * unit,
          deltaY: e.deltaY * unit,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
        },
        localPoint(el, e),
      );
      store().setViewport(next);
    };

    // WebKitGTK may report pinch as gesture events instead of ctrl+wheel.
    let lastScale = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      lastScale = (e as GestureEvent).scale || 1;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as GestureEvent;
      if (!store().document || !g.scale) return;
      const factor = g.scale / lastScale;
      lastScale = g.scale;
      store().setViewport(zoomAround(store().viewport, factor, localPoint(el, g)));
    };

    let drag: { id: number; last: Point } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      if (!store().document) return;
      const middle = e.button === 1;
      const spaceLeft = e.button === 0 && spaceRef.current;
      if (!middle && !spaceLeft) return;
      e.preventDefault();
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, last: { x: e.clientX, y: e.clientY } };
      setPanning(true);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) {
        const dx = e.clientX - drag.last.x;
        const dy = e.clientY - drag.last.y;
        drag.last = { x: e.clientX, y: e.clientY };
        store().setViewport(panBy(store().viewport, dx, dy));
      }
      store().setPointer(localPoint(el, e));
    };
    const endDrag = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      setPanning(false);
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    const onLeave = () => store().setPointer(null);
    // Middle-click autoscroll/paste must not fire.
    const onAux = (e: MouseEvent) => e.button === 1 && e.preventDefault();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTextTarget(e.target)) return;
      e.preventDefault();
      if (!spaceRef.current) {
        spaceRef.current = true;
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      spaceRef.current = false;
      setSpaceHeld(false);
    };
    const onBlur = () => {
      spaceRef.current = false;
      setSpaceHeld(false);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);
    el.addEventListener("pointerdown", onPointerDown, true);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("auxclick", onAux);
    el.addEventListener("mousedown", onAux);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
      el.removeEventListener("pointerdown", onPointerDown, true);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("auxclick", onAux);
      el.removeEventListener("mousedown", onAux);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [ref]);

  return { panReady: spaceHeld, panning };
}
