import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ThemeSetting } from "./theme";

export type InputKind = "none" | "path" | "stdin" | "clipboard";

export interface LaunchOptions {
  inputKind: InputKind;
  inputPath: string | null;
  sourcePath: string | null;
  theme: ThemeSetting;
  statusLine: boolean;
  checkerboard: boolean;
}

export interface LoadedInput {
  url: string;
  path: string;
  name: string;
  bytes: number;
  sourcePath: string | null;
}

export const EXIT_OK = 0;

export function takeLaunchOptions(): Promise<LaunchOptions | null> {
  return invoke("take_launch_options");
}

export function loadInput(path: string, staged = false): Promise<LoadedInput> {
  return invoke("load_input", { path, staged });
}

export function loadClipboard(): Promise<LoadedInput> {
  return invoke("load_clipboard");
}

export function exitApplication(code = EXIT_OK): Promise<void> {
  return invoke("exit_application", { code });
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
