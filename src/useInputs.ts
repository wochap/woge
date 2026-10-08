import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  loadClipboard,
  loadInput,
  pickImage,
  takeLaunchOptions,
  type LaunchOptions,
  type LoadedInput,
} from "./lib/backend";
import { DECODE_ERROR, createLoadGuard, decodeUrl } from "./lib/decode";
import { useEditor } from "./store/editor";

function message(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return DECODE_ERROR;
}

function baseName(path: string): string {
  return path.split("/").pop() || path;
}

/**
 * Every way an image enters the editor: launch options, drag and drop, Ctrl+O, Ctrl+V.
 * All of them funnel through `run`, which drops superseded loads.
 */
export function useInputs(onLaunch: (opts: LaunchOptions) => void) {
  const guard = useRef(createLoadGuard()).current;
  const [dropActive, setDropActive] = useState(false);

  const run = useCallback(
    async (name: string, fetchInput: () => Promise<LoadedInput>) => {
      const id = guard.begin();
      const { setLoading, setDocument, showToast } = useEditor.getState();
      setLoading({ name });
      try {
        const loaded = await fetchInput();
        if (!guard.isCurrent(id)) return;
        setLoading({ name: loaded.name });
        let bitmap: ImageBitmap;
        try {
          bitmap = await decodeUrl(loaded.url);
        } catch {
          throw new Error(DECODE_ERROR);
        }
        if (!guard.isCurrent(id)) return bitmap.close();
        setDocument({
          base: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          sourcePath: loaded.sourcePath,
          name: loaded.name,
        });
        setLoading(null);
      } catch (err) {
        if (!guard.isCurrent(id)) return;
        setLoading(null);
        showToast(message(err), "error");
      }
    },
    [guard],
  );

  const openPath = useCallback((path: string) => run(baseName(path), () => loadInput(path)), [run]);
  const openClipboard = useCallback(() => run("clipboard", loadClipboard), [run]);
  const openDialog = useCallback(async () => {
    try {
      const path = await pickImage();
      if (path) await openPath(path);
    } catch (err) {
      useEditor.getState().showToast(message(err), "error");
    }
  }, [openPath]);

  // Launch options arrive once; a dev hot reload gets null and keeps state.
  const launched = useRef(false);
  useEffect(() => {
    if (launched.current) return;
    launched.current = true;
    takeLaunchOptions()
      .then((opts) => {
        if (!opts) return;
        onLaunch(opts);
        if (opts.inputKind === "path" && opts.inputPath) openPath(opts.inputPath);
        else if (opts.inputKind === "stdin" && opts.inputPath) {
          const p = opts.inputPath;
          run("stdin", () => loadInput(p, true));
        } else if (opts.inputKind === "clipboard") openClipboard();
      })
      .catch(() => {
        /* Not running inside Tauri (plain vite dev). */
      });
  }, [onLaunch, openPath, openClipboard, run]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    try {
      getCurrentWebview()
        .onDragDropEvent((event) => {
          const p = event.payload;
          if (p.type === "enter" || p.type === "over") setDropActive(true);
          else if (p.type === "leave") setDropActive(false);
          else if (p.type === "drop") {
            setDropActive(false);
            if (p.paths[0]) openPath(p.paths[0]);
          }
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
  }, [openPath]);

  return { dropActive, openDialog, openClipboard };
}
