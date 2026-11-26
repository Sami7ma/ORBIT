export type Viewport = { width: number; height: number };
export type ResizeEdge = "North" | "South" | "East" | "West" | "NorthEast" | "NorthWest" | "SouthEast" | "SouthWest";
export const MIN_VIEWPORT: Viewport = { width: 160, height: 188 };

export function viewportBounds(cityCount: number) {
  const count = Math.max(1, cityCount);
  return { minWidth: 160, minHeight: 188, maxWidth: 40 + 120 * count, maxHeight: 28 + 160 * count };
}

export function fitViewport(viewport: Viewport, cityCount: number): Viewport {
  const bounds = viewportBounds(cityCount);
  return {
    width: Math.round(Math.max(bounds.minWidth, Math.min(bounds.maxWidth, viewport.width))),
    height: Math.round(Math.max(bounds.minHeight, Math.min(bounds.maxHeight, viewport.height))),
  };
}

export function resizeViewport(start: Viewport, edge: ResizeEdge, dx: number, dy: number, count: number): Viewport {
  return fitViewport({
    width: start.width + (edge.includes("East") ? dx : edge.includes("West") ? -dx : 0),
    height: start.height + (edge.includes("South") ? dy : edge.includes("North") ? -dy : 0),
  }, count);
}

export const viewportRows = (height: number) => Math.max(1, Math.floor((height - 28) / 160));
