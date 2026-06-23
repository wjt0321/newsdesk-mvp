import { open } from "@tauri-apps/plugin-shell";

export async function openExternal(url: string): Promise<void> {
  if (!url) return;
  try {
    await open(url);
  } catch {
    // Fallback for non-Tauri environments (e.g. browser dev).
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
