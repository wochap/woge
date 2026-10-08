import { create } from "zustand";
import { pictureDir } from "@tauri-apps/api/path";
import {
  EXIT_CANCELLED,
  EXIT_OK,
  copyImage,
  exitApplication,
  pickSavePath,
  printSavedPath,
  restoreBackup,
  runHook,
  writeOutput,
  type Format,
  type HookContext,
  type LaunchOptions,
  type OnSave,
} from "../lib/backend";
import {
  EXT,
  WEBP_UNSUPPORTED,
  exportDocument,
  extOf,
  formatFromExt,
  resolveFormat,
  rewriteExtension,
} from "../lib/export";
import type { Document } from "../model/document";
import { useEditor } from "./editor";

interface OutputState {
  /** `-o` path, already matching the format. */
  outputTarget: string | null;
  format: Format | null;
  onSave: OnSave;
  copyOnSave: boolean;
  jpegQuality: number;
  webpQuality: number;
  scripted: boolean;
  /** Document as last loaded or saved; dirty = present !== lastSaved. */
  lastSaved: Document | null;
  savedOnce: boolean;
  busy: boolean;
  closeDialog: boolean;

  configure(opts: LaunchOptions): void;
  markSaved(doc: Document | null): void;
  setCloseDialog(open: boolean): void;
}

export const useOutput = create<OutputState>((set) => ({
  outputTarget: null,
  format: null,
  onSave: "exit",
  copyOnSave: false,
  jpegQuality: 92,
  webpQuality: 90,
  scripted: false,
  lastSaved: null,
  savedOnce: false,
  busy: false,
  closeDialog: false,

  configure(o) {
    set({
      outputTarget: o.outputPath,
      format: o.format,
      onSave: o.onSave,
      copyOnSave: o.copyOnSave,
      jpegQuality: o.jpegQuality,
      webpQuality: o.webpQuality,
      scripted: o.scripted,
    });
  },
  markSaved(doc) {
    set({ lastSaved: doc });
  },
  setCloseDialog(open) {
    set({ closeDialog: open });
  },
}));

export function isDirty(doc: Document | null, lastSaved: Document | null): boolean {
  return !!doc && doc !== lastSaved;
}

export const useDirty = () => {
  const doc = useEditor((s) => s.document);
  const lastSaved = useOutput((s) => s.lastSaved);
  return isDirty(doc, lastSaved);
};

function message(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return String(err);
}

function hookContext(doc: Document, output: string | null, format: Format): HookContext {
  return {
    input: doc.source.path,
    output,
    width: doc.size.w,
    height: doc.size.h,
    format,
  };
}

/** Exit code when closing without (further) saving. */
export function closeCode(scripted: boolean, savedOnce: boolean): number {
  return scripted && !savedOnce ? EXIT_CANCELLED : EXIT_OK;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function timestamp(d = new Date()): string {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/** `<stem>-edited.<ext>` beside the source, else `<pictures>/woge-<timestamp>.<ext>`. */
export function defaultSaveAsPath(
  sourcePath: string | null,
  format: Format,
  picturesDir: string,
  now = new Date(),
): string {
  const ext = EXT[format];
  if (sourcePath) {
    const slash = sourcePath.lastIndexOf("/");
    const dir = sourcePath.slice(0, slash + 1);
    const name = sourcePath.slice(slash + 1);
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    return `${dir}${stem}-edited.${ext}`;
  }
  return `${picturesDir.replace(/\/$/, "")}/woge-${timestamp(now)}.${ext}`;
}

/** The dialog's extension wins when it is an image format; otherwise append the resolved one. */
export function resolveChosenPath(
  chosen: string,
  format: Format,
): { path: string; format: Format; appended: boolean } {
  const fromDialog = formatFromExt(extOf(chosen));
  if (fromDialog) return { path: chosen, format: fromDialog, appended: false };
  return { path: rewriteExtension(chosen, format), format, appended: true };
}

function currentFormat(): Format {
  const doc = useEditor.getState().document;
  return resolveFormat(useOutput.getState().format, doc?.source.path ?? null);
}

function quality(format: Format): number | undefined {
  const o = useOutput.getState();
  if (format === "jpeg") return o.jpegQuality / 100;
  if (format === "webp") return o.webpQuality / 100;
  return undefined;
}

interface SaveOptions {
  /** Ctrl+S may exit per `on_save`; Save as never does. */
  allowExit: boolean;
  /** Close dialog "Save": exit after success regardless of `on_save`. */
  closeAfter?: boolean;
}

async function writeTo(path: string, format: Format, opts: SaveOptions): Promise<boolean> {
  const { document: doc, bitmap, showToast } = useEditor.getState();
  if (!doc || !bitmap) return false;
  const out = useOutput.getState();
  if (out.busy) return false;
  useOutput.setState({ busy: true });
  try {
    const exported = await exportDocument(doc, bitmap, format, quality(format));
    let target = path;
    let note: string | null = null;
    if (exported.format !== format) {
      target = rewriteExtension(path, exported.format);
      note = WEBP_UNSUPPORTED;
    }
    let report;
    try {
      report = await writeOutput(exported.bytes, target, exported.format);
    } catch (err) {
      const m = message(err);
      showToast(m.includes(target) ? m : `${target}: ${m}`, "error");
      return false;
    }
    await printSavedPath(report.path);
    useOutput.setState({ lastSaved: doc, savedOnce: true });
    const ctx = hookContext(doc, report.path, exported.format);
    runHook("on_save", ctx).catch(() => {});
    if (note) showToast(note, "info");
    else if (report.overwrote)
      showToast(`Saved to ${report.path} · overwrote previous`, "success", {
        label: "Undo",
        run: () => undoOverwrite(report.path),
      });
    else showToast(`Saved to ${report.path}`, "success");
    if (out.copyOnSave) await copyResult();
    if (opts.closeAfter || (opts.allowExit && out.onSave === "exit"))
      await exitApplication(EXIT_OK, ctx);
    return true;
  } catch (err) {
    showToast(message(err), "error");
    return false;
  } finally {
    useOutput.setState({ busy: false });
  }
}

export async function undoOverwrite(path: string) {
  const { showToast } = useEditor.getState();
  try {
    await restoreBackup(path);
    showToast(`Restored ${path}`, "info");
  } catch (err) {
    showToast(message(err), "error");
  }
}

/** Ctrl+S: `-o` path, else the source path, else Save as. */
export async function save(closeAfter = false): Promise<boolean> {
  const doc = useEditor.getState().document;
  if (!doc) return false;
  const format = currentFormat();
  const { outputTarget } = useOutput.getState();
  const target =
    outputTarget ?? (doc.source.path ? rewriteExtension(doc.source.path, format) : null);
  if (!target) return saveAs(closeAfter);
  return writeTo(target, outputTarget ? (formatFromExt(extOf(target)) ?? format) : format, {
    allowExit: true,
    closeAfter,
  });
}

async function picturesFallback(): Promise<string> {
  try {
    return await pictureDir();
  } catch {
    return "~/Pictures";
  }
}

/** Ctrl+Shift+S: native dialog; never exits unless the close dialog asked for it. */
export async function saveAs(closeAfter = false): Promise<boolean> {
  const { document: doc, showToast } = useEditor.getState();
  if (!doc) return false;
  const format = currentFormat();
  const pics = doc.source.path ? "" : await picturesFallback();
  let chosen: string | null;
  try {
    chosen = await pickSavePath(defaultSaveAsPath(doc.source.path, format, pics));
  } catch (err) {
    showToast(message(err), "error");
    return false;
  }
  if (!chosen) return false;
  const r = resolveChosenPath(chosen, format);
  const ok = await writeTo(r.path, r.format, { allowExit: false, closeAfter });
  if (ok && r.appended)
    showToast(`Saved as ${r.path} (".${extOf(chosen) ?? ""}" is not an image format)`, "info");
  return ok;
}

/** Copy result: PNG via the configured clipboard tool. Never changes dirty state. */
export async function copyResult(): Promise<boolean> {
  const { document: doc, bitmap, showToast } = useEditor.getState();
  if (!doc || !bitmap) return false;
  try {
    const { bytes } = await exportDocument(doc, bitmap, "png");
    const clip = await copyImage(bytes);
    showToast("Copied to clipboard", "success");
    runHook("on_copy", hookContext(doc, clip, "png")).catch(() => {});
    return true;
  } catch (err) {
    showToast(message(err), "error");
    return false;
  }
}

/** Ctrl+Q, the close button and the window manager's close all land here. */
export function requestClose() {
  const doc = useEditor.getState().document;
  const { lastSaved, scripted, savedOnce } = useOutput.getState();
  if (isDirty(doc, lastSaved)) return useOutput.getState().setCloseDialog(true);
  exitApplication(closeCode(scripted, savedOnce)).catch(() => window.close());
}

export function discardAndClose() {
  const { scripted, savedOnce } = useOutput.getState();
  useOutput.getState().setCloseDialog(false);
  exitApplication(closeCode(scripted, savedOnce)).catch(() => window.close());
}

export async function saveAndClose() {
  useOutput.getState().setCloseDialog(false);
  await save(true);
}

/** After a successful load: the loaded document is the clean baseline. */
export function onLoaded() {
  const doc = useEditor.getState().document;
  useOutput.getState().markSaved(doc);
  if (doc) runHook("on_load", hookContext(doc, null, currentFormat())).catch(() => {});
}
