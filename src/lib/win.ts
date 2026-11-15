// Thin wrapper so the UI also runs in a plain browser (npm run dev) for quick design work.
export const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function w() {
  const m = await import("@tauri-apps/api/window");
  return { win: m.getCurrentWindow(), Size: m.LogicalSize };
}

export async function resize(width: number, height: number) {
  if (!inTauri) return;
  const { win, Size } = await w();
  await win.setSize(new Size(Math.round(width), Math.round(height)));
}
export async function drag() { if (inTauri) (await w()).win.startDragging(); }
export async function closeApp() { if (inTauri) (await w()).win.close(); }
export async function minimize() { if (inTauri) (await w()).win.minimize(); }

/** float = always above other apps; desktop = sits on the desktop behind your windows. */
export async function setPin(mode: "float" | "desktop") {
  if (!inTauri) return;
  const { win } = await w();
  if (mode === "float") { await win.setAlwaysOnBottom(false); await win.setAlwaysOnTop(true); }
  else { await win.setAlwaysOnTop(false); await win.setAlwaysOnBottom(true); }
}

export async function setBlur(enabled: boolean) {
  if (!inTauri) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("set_blur", { enabled });
}
