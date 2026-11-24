import test from "node:test";
import assert from "node:assert/strict";
import { layoutQueue } from "../../src/platform/layout.ts";

test("window layout calls are serialized and only the newest queued layout runs", async () => {
  const applied = [];
  let release;
  const blocked = new Promise((resolve) => { release = resolve; });
  const queue = layoutQueue(async (layout) => { applied.push(layout.width); if (layout.width === 100) await blocked; });
  const first = queue({ width: 100, height: 100, scale: 1 });
  await new Promise((resolve) => setImmediate(resolve));
  const intermediate = queue({ width: 200, height: 200, scale: 1 });
  const latest = queue({ width: 300, height: 300, scale: 1 });
  release();
  await Promise.all([first, intermediate, latest]);
  assert.deepEqual(applied, [100, 300]);
});

test("a failed native layout is reported and does not block future updates", async () => {
  const applied = [];
  const queue = layoutQueue(async (layout) => { if (layout.width === 100) throw new Error("native failure"); applied.push(layout.width); });
  await assert.rejects(queue({ width: 100, height: 100, scale: 1 }), /native failure/);
  await queue({ width: 300, height: 300, scale: 1 });
  assert.deepEqual(applied, [300]);
});


import { fitViewport, resizeViewport, viewportRows } from "../../src/platform/viewport.ts";

test("every resize edge preserves at least one complete clock without changing the city list", () => {
  const initial = { width: 520, height: 348 };
  for (const edge of ["North", "South", "East", "West", "NorthEast", "NorthWest", "SouthEast", "SouthWest"]) {
    const dx = edge.includes("West") ? 1000 : -1000;
    const dy = edge.includes("North") ? 1000 : -1000;
    const next = resizeViewport(initial, edge, dx, dy, 4);
    assert.ok(next.width >= 160);
    assert.ok(next.height >= 188);
    if (edge.includes("West") || edge.includes("East")) assert.equal(next.width, 160);
    if (edge.includes("North") || edge.includes("South")) assert.equal(next.height, 188);
  }
});

test("one-city layouts fit the clock instead of reserving three empty columns", () => {
  assert.deepEqual(fitViewport({ width: 520, height: 508 }, 1), { width: 160, height: 188 });
  assert.equal(viewportRows(188), 1);
  assert.equal(viewportRows(347), 1);
  assert.equal(viewportRows(348), 2);
});
