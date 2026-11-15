import { useCallback, useEffect, useState } from "react";

export type Settings = {
  style: "glass" | "black";
  clear: number;        // 0 (dense) .. 100 (most see-through)
  blur: boolean;        // blur the desktop behind the widget
  bg: string;           // "none" | built-in id | "custom"
  bgStrength: number;   // 20..100
  scale: number;        // 0.7 .. 1.5
  minimal: boolean;     // collapse to tiny rings until hovered
  pin: "float" | "desktop";
  lock: boolean;        // stop the widget from being dragged
  h24: boolean;
  ampm: boolean;
  utc: boolean;         // label offsets as UTC instead of GMT
  weather: boolean;
};

export const DEFAULTS: Settings = {
  style: "glass", clear: 60, blur: true, bg: "none", bgStrength: 75,
  scale: 1, minimal: false, pin: "float", lock: false,
  h24: false, ampm: true, utc: false, weather: true,
};

const KEY = "orbit.settings.v1";

export function useSettings(): [Settings, (p: Partial<Settings>) => void] {
  const [s, setS] = useState<Settings>(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
    catch { return DEFAULTS; }
  });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }, [s]);
  const set = useCallback((p: Partial<Settings>) => setS((o) => ({ ...o, ...p })), []);
  return [s, set];
}
