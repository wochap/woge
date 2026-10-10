import { useCallback, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Stage } from "./canvas/Stage";
import { EmptyState } from "./chrome/EmptyState";
import { OptionsStrip, editorRows, stripLabel } from "./chrome/OptionsStrip";
import { ShortcutOverlay } from "./chrome/ShortcutOverlay";
import { StatusLine } from "./chrome/StatusLine";
import { Toast } from "./chrome/Toast";
import { Toolbar } from "./chrome/Toolbar";
import { TopBar } from "./chrome/TopBar";
import { CloseDialog } from "./chrome/CloseDialog";
import type { LaunchOptions } from "./lib/backend";
import { useCompact } from "./lib/compact";
import { comboOf, useKeymap, type KeyHandlers } from "./lib/keys";
import { useTheme, type ThemeSetting } from "./lib/theme";
import { useEditor } from "./store/editor";
import {
  copyResult,
  discardAndClose,
  requestClose,
  save,
  saveAndClose,
  saveAs,
  useDirty,
  useOutput,
} from "./store/output";
import { useInputs } from "./useInputs";
import { canRedo, canUndo } from "./store/history";
import { visibleSize } from "./model/document";
import type { ToolId } from "./tools/registry";
import { cancelMode, confirmMode, enterMode, nudge } from "./tools/mode";
import { CropStrip } from "./tools/crop/CropStrip";
import { ResizeStrip } from "./tools/resize/ResizeStrip";
import { formatCropStatus } from "./tools/crop/math";
import { originalSize, percentOf } from "./tools/resize/math";
import { useSettings } from "./store/settings";
import { useAnnotationStrip } from "./chrome/strips/AnnotationStrip";
import { setColour, stepOpacity, stripContext } from "./chrome/strips/apply";
import { SWATCHES } from "./model/palette";
import type { ColorRole } from "./model/roles";
import { stepTextSize } from "./chrome/strips/TextStrip";
import {
  deleteSelection,
  nudgeSelection,
  reorderSelection,
  selectionBounds,
} from "./tools/select/useSelectTool";
import { openTextEditor } from "./tools/text/editing";
import { openBadgeEditor } from "./tools/badge/editing";
import { boundsOf } from "./model/objects";

/** Ctrl+C copies objects when any are selected, the image otherwise. */
function hasSelection(): boolean {
  return useEditor.getState().selection.length > 0;
}

export default function App() {
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>("auto");
  const [overlayOpen, setOverlayOpen] = useState(false);
  useTheme(themeSetting);
  const compact = useCompact();

  const s = useEditor();
  const onLaunch = useCallback((opts: LaunchOptions) => {
    setThemeSetting(opts.theme);
    useEditor.getState().setStatusLine(opts.statusLine);
    useEditor.getState().setCheckerboard(opts.checkerboard);
    useOutput.getState().configure(opts);
    useSettings.getState().init(opts.defaults, opts.toolSticky ?? true);
    useEditor.setState({ badgeRenumber: opts.badgeRenumber ?? true });
  }, []);
  const { dropActive, openDialog, openClipboard } = useInputs(onLaunch);

  const dirty = useDirty();
  const closeDialog = useOutput((o) => o.closeDialog);
  const cancelClose = useCallback(() => useOutput.getState().setCloseDialog(false), []);

  // The window manager's close goes through the same confirmation.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    try {
      getCurrentWindow()
        .onCloseRequested((e) => {
          e.preventDefault();
          requestClose();
        })
        .then((fn) => (cancelled ? fn() : (unlisten = fn)))
        .catch(() => {});
    } catch {
      /* Not running inside Tauri. */
    }
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const inMode = s.mode !== "none";
  const selectTool = (tool: ToolId, e: { shiftKey: boolean }) => {
    if (!s.document) return;
    if (tool === "crop" || tool === "resize") enterMode(tool);
    else if (inMode) return;
    else if (tool === "rotate") s.rotate(e.shiftKey ? "ccw" : "cw");
    else s.setActiveTool(tool);
  };
  const undo = () => {
    cancelMode();
    useEditor.getState().undo();
  };
  const redo = () => {
    cancelMode();
    useEditor.getState().redo();
  };

  const editingObjects = !!s.document && !inMode;
  /** Strip context for colour keys: none in modes, without a document, or Select with nothing. */
  const colourCtx = () => {
    const d = useEditor.getState().document;
    if (!d || inMode) return null;
    const st = useEditor.getState();
    return stripContext(st.activeTool, st.selection, d.objects);
  };
  const colourKey = (role: ColorRole) => (e: KeyboardEvent) => {
    const ctx = colourCtx();
    const digit = Number(comboOf(e).slice(-1));
    if (ctx) setColour(ctx, role, SWATCHES[(digit + 9) % 10]);
  };
  const opacityKey = (role: ColorRole) => (e: KeyboardEvent) => {
    const ctx = colourCtx();
    if (ctx) stepOpacity(ctx, role, comboOf(e).endsWith("]") ? 1 : -1);
  };
  const handlers: KeyHandlers = {
    "tool.select": (e) => selectTool("select", e),
    "tool.rect": (e) => selectTool("rect", e),
    "tool.ellipse": (e) => selectTool("ellipse", e),
    "tool.arrow": (e) => selectTool("arrow", e),
    "tool.text": (e) => selectTool("text", e),
    "tool.brush": (e) => selectTool("brush", e),
    "tool.highlighter": (e) => selectTool("highlighter", e),
    "tool.redact": (e) => selectTool("redact", e),
    "tool.counter": (e) => selectTool("counter", e),
    "edit.delete": () => editingObjects && deleteSelection(),
    "edit.duplicate": () => editingObjects && s.duplicate(s.selection),
    "edit.selectAll": () => {
      if (!editingObjects) return;
      s.setActiveTool("select");
      s.selectAll();
    },
    "edit.cut": () => editingObjects && s.cutObjects(),
    "edit.forward": (e) => editingObjects && reorderSelection(e.shiftKey ? "front" : "forward"),
    "edit.backward": (e) => editingObjects && reorderSelection(e.shiftKey ? "back" : "backward"),
    "text.size": (e) => {
      if (!editingObjects || !doc) return;
      const ctx = stripContext(s.activeTool, s.selection, doc.objects);
      if (ctx?.kind !== "text") return;
      stepTextSize(ctx, e.key === ">" || e.key === "." ? 1 : -1);
    },
    "tool.crop": (e) => selectTool("crop", e),
    "tool.resize": (e) => selectTool("resize", e),
    "tool.rotate": (e) => selectTool("rotate", e),
    "edit.undo": (e) => {
      if (s.pointerDrag) return;
      if (e.shiftKey) redo();
      else undo();
    },
    "edit.applyCancel": (e) => {
      if (inMode) {
        if (e.key === "Enter") confirmMode();
        else cancelMode();
        return;
      }
      if (!doc) return;
      if (e.key === "Enter") {
        const only = s.selection.length === 1 && doc.objects.find((o) => o.id === s.selection[0]);
        if (only && only.type === "text") openTextEditor(only.id);
        else if (only && only.type === "badge") openBadgeEditor(only.id);
      } else if (s.selection.length) s.clearSelection();
      else if (s.activeTool !== "select") s.setActiveTool("select");
    },
    "edit.nudge": (e) => {
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      if (inMode) nudge(dx, dy);
      else if (editingObjects) nudgeSelection(dx, dy);
    },
    "colour.primary": colourKey("primary"),
    "colour.fill": colourKey("secondary"),
    "opacity.primary": opacityKey("primary"),
    "opacity.fill": opacityKey("secondary"),
    "view.fit": s.fit,
    "view.actual": s.actualSize,
    "view.zoomIn": () => s.zoomStep(1),
    "view.zoomOut": () => s.zoomStep(-1),
    "file.open": openDialog,
    "file.paste": () => {
      if (editingObjects && s.pasteObjects()) return;
      openClipboard();
    },
    "app.shortcuts": () => setOverlayOpen(true),
    "file.copy": () => {
      if (!s.document || inMode) return;
      if (hasSelection()) s.copyObjects();
      else copyResult();
    },
    "file.save": () => {
      if (s.document && !inMode) save();
    },
    "file.saveAs": () => {
      if (s.document && !inMode) saveAs();
    },
    "app.quit": requestClose,
    "overlay.close": () => setOverlayOpen(false),
  };
  useKeymap(handlers, { overlayOpen: overlayOpen || closeDialog });

  const doc = s.document;
  const loadingName = s.loading?.name ?? null;
  const dims = doc ? visibleSize(doc) : null;
  let statusDetail: string | null = null;
  if (s.mode === "crop" && s.cropDraft) statusDetail = formatCropStatus(s.cropDraft);
  else if (s.mode === "resize" && doc && s.resizeDraft)
    statusDetail = `scale ${percentOf(originalSize(doc), s.resizeDraft)}%`;
  else if (s.liveSize) statusDetail = `${Math.round(s.liveSize.w)} × ${Math.round(s.liveSize.h)}`;
  else if (s.drawing && s.drawing.type !== "text") {
    const b = boundsOf(s.drawing);
    statusDetail = `${Math.round(b.w)} × ${Math.round(b.h)}`;
  } else if (s.selection.length) {
    const b = selectionBounds();
    if (b) statusDetail = `sel ${Math.round(b.w)} × ${Math.round(b.h)}`;
  }
  const annotationStrip = useAnnotationStrip();
  const history = {
    canUndo: !!doc && canUndo(s.history),
    canRedo: !!doc && canRedo(s.history),
    onUndo: undo,
    onRedo: redo,
  };

  return (
    <div className="editor" style={{ gridTemplateRows: editorRows(s.statusLine) }}>
      <TopBar
        name={loadingName ?? doc?.source.name ?? null}
        dims={dims && !s.loading ? { width: dims.w, height: dims.h } : null}
        loading={!!s.loading}
        scale={doc ? s.viewport.scale : null}
        compactNarrow={compact.narrow}
        compactShort={compact.short}
        checkerboard={s.checkerboard}
        dirty={dirty}
        {...history}
        onFit={s.fit}
        onActual={s.actualSize}
        onZoomIn={() => s.zoomStep(1)}
        onZoomOut={() => s.zoomStep(-1)}
        onToggleCheckerboard={() => s.setCheckerboard(!s.checkerboard)}
        onClose={requestClose}
        onCopy={copyResult}
        onSave={() => save()}
        onSaveAs={() => saveAs()}
      />
      <Toolbar
        activeTool={s.activeTool}
        hasDocument={!!doc}
        showHistory={!compact.short}
        {...history}
        onSelect={selectTool}
      />
      {/* Modes and annotation tools render their controls here. */}
      <OptionsStrip
        compact={compact.narrow}
        label={stripLabel(s.mode !== "none" ? s.mode : s.activeTool)}
        hasDocument={!!doc}
      >
        {s.mode === "crop" ? (
          <CropStrip />
        ) : s.mode === "resize" ? (
          <ResizeStrip />
        ) : (
          annotationStrip
        )}
      </OptionsStrip>
      <Stage checkerboard={s.checkerboard}>
        {!doc && <EmptyState dropActive={dropActive} />}
        {doc && dropActive && <div className="drop-outline" />}
      </Stage>
      {s.statusLine && <StatusLine pointer={s.pointer} detail={statusDetail} />}
      <Toast toast={s.toast} onDismiss={s.dismissToast} />
      {overlayOpen && <ShortcutOverlay onClose={() => setOverlayOpen(false)} />}
      {closeDialog && (
        <CloseDialog onDiscard={discardAndClose} onCancel={cancelClose} onSave={saveAndClose} />
      )}
    </div>
  );
}
