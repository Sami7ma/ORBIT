import { useEffect, useRef } from "react";
import { inTauri, resizeWindow } from "../lib/win";
import { resizeViewport, type ResizeEdge, type Viewport } from "../platform/viewport.ts";

const edges: [ResizeEdge, string][] = [
  ["North", "top"], ["South", "bottom"], ["East", "right"], ["West", "left"],
  ["NorthEast", "top-right"], ["NorthWest", "top-left"], ["SouthEast", "bottom-right"], ["SouthWest", "bottom-left"],
];
type Props = { viewport: Viewport; count: number; scale: number; onResize: (size: Viewport) => void; onError: (error: unknown) => void };

export default function ResizeHandles({ viewport, count, scale, onResize, onError }: Props) {
  const cleanup = useRef<() => void>();
  useEffect(() => () => cleanup.current?.(), []);
  const begin = (event: React.PointerEvent, edge: ResizeEdge) => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    if (inTauri) { void resizeWindow(edge).catch(onError); return; }
    cleanup.current?.();
    const x = event.clientX, y = event.clientY;
    const move = (next: PointerEvent) => onResize(resizeViewport(viewport, edge, (next.clientX - x) / scale, (next.clientY - y) / scale, count));
    const finish = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish);
      cleanup.current = undefined;
    };
    cleanup.current = finish;
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", finish); window.addEventListener("pointercancel", finish);
  };
  return <>{edges.map(([edge, label]) => <div key={edge} role="separator" tabIndex={0}
    aria-label={`Resize from ${label}`} aria-orientation={edge === "North" || edge === "South" ? "horizontal" : "vertical"}
    className={`resize-edge resize-${edge.toLowerCase()}`} title={`Resize from ${label}; arrow keys also work`}
    onPointerDown={(event) => begin(event, edge)} onKeyDown={(event) => {
      const delta: Record<string, [number, number]> = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
      if (!delta[event.key]) return;
      event.preventDefault(); event.stopPropagation();
      onResize(resizeViewport(viewport, edge, ...delta[event.key], count));
    }} />)}</>;
}
