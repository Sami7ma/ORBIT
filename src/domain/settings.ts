export type Settings = {
  style: "glass" | "black";
  clear: number;
  blur: boolean;
  bg: string;
  scale: number;
  viewportWidth: number;
  viewportHeight: number;
  lock: boolean;
  pinned: boolean;
  h24: boolean;
  ampm: boolean;
  utc: boolean;
  weather: boolean;
  temperatureUnit: "celsius" | "fahrenheit";
};

export const DEFAULTS: Settings = {
  style: "glass", clear: 60, blur: true, bg: "none", scale: 1, lock: false, pinned: false,
  viewportWidth: 520, viewportHeight: 188,
  h24: false, ampm: true, utc: false, weather: true, temperatureUnit: "celsius",
};
export const SETTINGS_KEY = "orbit.settings.v2";
const backgrounds = new Set(["none", "custom", "forest", "mist", "aurora", "dusk", "dunes", "alpine", "bokeh", "space"]);

export function cleanSettings(raw: unknown): Settings {
  const settings = { ...DEFAULTS };
  if (raw && typeof raw === "object") for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === typeof DEFAULTS[key]) (settings as Record<string, unknown>)[key] = value;
  }
  settings.scale = Number.isFinite(settings.scale) ? Math.min(1.5, Math.max(0.7, settings.scale)) : DEFAULTS.scale;
  settings.viewportWidth = Number.isFinite(settings.viewportWidth) ? Math.max(160, Math.min(10000, settings.viewportWidth)) : DEFAULTS.viewportWidth;
  settings.viewportHeight = Number.isFinite(settings.viewportHeight) ? Math.max(188, Math.min(10000, settings.viewportHeight)) : DEFAULTS.viewportHeight;
  settings.clear = Number.isFinite(settings.clear) ? Math.min(100, Math.max(0, settings.clear)) : DEFAULTS.clear;
  if (!["glass", "black"].includes(settings.style)) settings.style = DEFAULTS.style;
  if (!["celsius", "fahrenheit"].includes(settings.temperatureUnit)) settings.temperatureUnit = DEFAULTS.temperatureUnit;
  if (!backgrounds.has(settings.bg)) settings.bg = DEFAULTS.bg;
  return settings;
}
