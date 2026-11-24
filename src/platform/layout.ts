export type Layout = { scale: number; width: number; height: number };

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
