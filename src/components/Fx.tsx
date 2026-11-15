import { useMemo } from "react";
import type { Kind } from "../lib/weather";

// Tiny CSS-only weather scenes: no canvas, no images, near-zero CPU.
export default function Fx({ kind, night }: { kind: Kind; night: boolean }) {
  const bits = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ x: (i * 37 + 11) % 100, t: 1 + ((i * 13) % 10) / 10, s: ((i * 7) % 20) / 10 })),
    []
  );
  const fall = (cls: string, base: number) => (
    <div className={`fx ${cls}`}>
      {bits.map((b, i) => (
        <i key={i} style={{ left: `${b.x}%`, animationDuration: `${b.t * base}s`, animationDelay: `-${b.s * base}s` }} />
      ))}
    </div>
  );
  if (kind === "snow") return fall("fx-snow", 3);
  if (kind === "rain") return fall("fx-rain", 0.9);
  if (kind === "storm") return <>{fall("fx-rain", 0.7)}<div className="fx fx-flash" /></>;
  if (kind === "fog") return <div className="fx fx-fog"><span /><span /></div>;
  if (kind === "cloud") return <div className="fx fx-cloud"><span /><span /><span /></div>;
  return night ? (
    <div className="fx fx-night"><span className="moon" /><i /><i /><i /></div>
  ) : (
    <div className="fx fx-sun"><span className="sun" /></div>
  );
}
