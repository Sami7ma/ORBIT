export type WindowBounds = { minWidth: number; minHeight: number; maxWidth: number; maxHeight: number };
export type Layout = { scale: number; width: number; height: number; bounds?: WindowBounds };

/** Serialize native calls and skip queued intermediate sizes during a resize gesture. */
export function layoutQueue(apply: (layout: Layout) => Promise<void>) {
  let newest = 0;
  let pending = Promise.resolve();
  return (layout: Layout): Promise<void> => {
    const sequence = ++newest;
    const next = pending.catch(() => {}).then(async () => { if (sequence === newest) await apply(layout); });
    pending = next;
    return next;
  };
}

/** Treat only the most recent size as known, including manual compositor resizes. */
export function windowSizeTracker() {
  let known: { width: number; height: number } | undefined;
  return {
    expect(size: { width: number; height: number }) { known = size; },
    accept(size: { width: number; height: number }) {
      if (known && Math.abs(known.width - size.width) <= 1 && Math.abs(known.height - size.height) <= 1) return false;
      known = size;
      return true;
    },
  };
}
