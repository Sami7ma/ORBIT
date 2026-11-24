import { invoke, isTauri } from "@tauri-apps/api/core";
import type { ResizeEdge } from "../platform/viewport.ts";
import { layoutQueue, type WindowBounds } from "../platform/layout.ts";

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
let applyingLayout = 0;
let lastZoom: number | undefined;
let lastBounds = "";
let requestedSize: { width: number; height: number } | undefined;
const applyLayout = layoutQueue(async ({ scale, width, height, bounds }) => {
  if (!inTauri) { document.body.style.setProperty("zoom", String(scale)); return; }
  const platform = await getPlatform();
  if (platform === "android" || platform === "ios") return;
  const { getCurrentWebview } = await import("@tauri-apps/api/webview");
  const { win, Size } = await w();
  applyingLayout++;
  requestedSize = { width: Math.round(width * scale), height: Math.round(height * scale) };
  try {
    if (lastZoom !== scale) { await getCurrentWebview().setZoom(scale); lastZoom = scale; }
    const nextBounds = JSON.stringify([scale, bounds]);
    if (bounds && nextBounds !== lastBounds) {
      await win.setSizeConstraints(Object.fromEntries(Object.entries(bounds).map(([key, value]) => [key, Math.round(value * scale)])));
      lastBounds = nextBounds;
    }
    const current = await win.innerSize(), dpi = await win.scaleFactor();
    if (Math.abs(current.width / dpi - width * scale) > 1 || Math.abs(current.height / dpi - height * scale) > 1) {
      await win.setSize(new Size(Math.round(width * scale), Math.round(height * scale)));
    }
  } finally { applyingLayout--; }
});
export function setLayout(scale: number, width: number, height: number, bounds?: WindowBounds) { return applyLayout({ scale, width, height, bounds }); }

export async function resizeWindow(edge: ResizeEdge) {
  if (inTauri) await (await w()).win.startResizeDragging(edge);
}

export async function observeWindowSize(onResize: (width: number, height: number) => void) {
  if (!inTauri) return () => {};
  const { win } = await w();
  let timer: ReturnType<typeof setTimeout>, disposed = false;
  const read = async () => {
    if (disposed) return;
    if (applyingLayout) { timer = setTimeout(() => { void read(); }, 50); return; }
    const [size, dpi] = await Promise.all([win.innerSize(), win.scaleFactor()]);
    if (disposed) return;
    if (applyingLayout) { timer = setTimeout(() => { void read(); }, 50); return; }
    const width = size.width / dpi, height = size.height / dpi;
    if (requestedSize && Math.abs(width - requestedSize.width) <= 1 && Math.abs(height - requestedSize.height) <= 1) return;
    onResize(width, height);
  };
  const stop = await win.onResized(() => {
    clearTimeout(timer);
    timer = setTimeout(() => { void read().catch(console.error); }, 80);
  });
  return () => { disposed = true; clearTimeout(timer); stop(); };
}
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
