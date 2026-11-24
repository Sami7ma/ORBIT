import { invoke, isTauri } from "@tauri-apps/api/core";
import { layoutQueue } from "../platform/layout.ts";

export const inTauri = isTauri();
let platform: Promise<string> | undefined;
export function getPlatform(): Promise<string> {
  if (!inTauri) return Promise.resolve("browser");
  if (!platform) platform = invoke<string>("runtime_platform").catch((error) => { platform = undefined; throw error; });
  return platform;
}

async function w() {
  const m = await import("@tauri-apps/api/window");
  return { win: m.getCurrentWindow(), Size: m.LogicalSize };
}

/**
 * Sizes the window AND zooms the page by the same factor, so the layout always fills the window
 * exactly (no gaps or misaligned glass while resizing).
 */
const applyLayout = layoutQueue(async ({ scale, width, height }) => {
  if (!inTauri) { document.body.style.setProperty("zoom", String(scale)); return; }
  const platform = await getPlatform();
  if (platform === "android" || platform === "ios") return;
  const { getCurrentWebview } = await import("@tauri-apps/api/webview");
  const { win, Size } = await w();
  await getCurrentWebview().setZoom(scale);
  await win.setSize(new Size(Math.round(width * scale), Math.round(height * scale)));
});
export function setLayout(scale: number, width: number, height: number) { return applyLayout({ scale, width, height }); }
export async function drag() { if (inTauri) await (await w()).win.startDragging(); }
export async function closeApp() { if (inTauri) await (await w()).win.close(); }

/** Widget behavior: sit on the desktop, behind your other windows. */
export async function pinToDesktop() {
  if (await getPlatform() !== "windows") return;
  const { win } = await w();
  await win.setAlwaysOnTop(false);
  await win.setAlwaysOnBottom(true);
}

export async function setBlur(enabled: boolean) {
  if (await getPlatform() !== "windows") return;
  await invoke("set_blur", { enabled });
}
