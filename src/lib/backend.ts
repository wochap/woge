import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { ThemeSetting } from "./theme";

export type InputKind = "none" | "path" | "stdin" | "clipboard";

export type Format = "png" | "jpeg" | "webp";
export type OnSave = "exit" | "stay";
export type HookKind = "on_load" | "on_save" | "on_copy";

export interface HookContext {
  input?: string | null;
  output?: string | null;
  width?: number;
  height?: number;
  format?: Format;
}

export interface WriteReport {
  path: string;
  overwrote: boolean;
}

export interface LaunchOptions {
  inputKind: InputKind;
  inputPath: string | null;
  sourcePath: string | null;
  theme: ThemeSetting;
  statusLine: boolean;
  checkerboard: boolean;
  outputPath: string | null;
  /** Flag > `-o` extension > config; null lets the source extension decide. */
  format: Format | null;
  onSave: OnSave;
  copyOnSave: boolean;
  jpegQuality: number;
  webpQuality: number;
  scripted: boolean;
  /** Config `[defaults]`. */
  defaults?: ConfigDefaults;
  toolSticky?: boolean;
}

export interface ConfigDefaults {
  color?: string | null;
  stroke?: string | null;
  font?: string | null;
  font_size?: number | null;
}

export interface LoadedInput {
  url: string;
  path: string;
  name: string;
  bytes: number;
  sourcePath: string | null;
}

export const EXIT_OK = 0;
export const EXIT_CANCELLED = 1;

export function takeLaunchOptions(): Promise<LaunchOptions | null> {
  return invoke("take_launch_options");
}

export function loadInput(path: string, staged = false): Promise<LoadedInput> {
  return invoke("load_input", { path, staged });
}

export function loadClipboard(): Promise<LoadedInput> {
  return invoke("load_clipboard");
}

export function exitApplication(code = EXIT_OK, ctx?: HookContext): Promise<void> {
  return invoke("exit_application", { code, ctx: ctx ?? null });
}

/** Bytes travel as a raw binary body; the path is URI-encoded so headers stay ASCII. */
export function writeOutput(bytes: Uint8Array, path: string, format: Format): Promise<WriteReport> {
  return invoke("write_output", bytes, {
    headers: { "x-woge-path": encodeURIComponent(path), "x-woge-format": format },
  });
}

export function restoreBackup(path: string): Promise<void> {
  return invoke("restore_backup", { path });
}

/** Resolves to the staged clip path. */
export function copyImage(bytes: Uint8Array): Promise<string> {
  return invoke("copy_image", bytes);
}

export function runHook(kind: HookKind, ctx: HookContext): Promise<void> {
  return invoke("run_hook", { kind, ctx });
}

export function printSavedPath(path: string): Promise<void> {
  return invoke("print_saved_path", { path });
}

export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

/** Native open dialog; resolves to null when cancelled. */
export async function pickImage(): Promise<string | null> {
  const picked = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Images", extensions: IMAGE_EXTENSIONS }],
  });
  return typeof picked === "string" ? picked : null;
}

/** Native save dialog; resolves to null when cancelled. */
export async function pickSavePath(defaultPath: string): Promise<string | null> {
  const picked = await save({
    defaultPath,
    filters: [
      { name: "PNG", extensions: ["png"] },
      { name: "JPEG", extensions: ["jpg", "jpeg"] },
      { name: "WebP", extensions: ["webp"] },
    ],
  });
  return picked ?? null;
}

export function listFonts(): Promise<string[]> {
  return invoke("list_fonts");
}

export function readState(): Promise<unknown | null> {
  return invoke("read_state");
}

export function writeState(state: unknown): Promise<void> {
  return invoke("write_state", { state });
}
