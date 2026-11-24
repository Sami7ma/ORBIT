export type Settings = {
  style: "glass" | "black";
  clear: number;
  blur: boolean;
  bg: string;
  scale: number;
  lock: boolean;
  h24: boolean;
  ampm: boolean;
  utc: boolean;
  weather: boolean;
  temperatureUnit: "celsius" | "fahrenheit";
};

export const DEFAULTS: Settings = {
  style: "glass", clear: 60, blur: true, bg: "none", scale: 1, lock: false,
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
  settings.clear = Number.isFinite(settings.clear) ? Math.min(100, Math.max(0, settings.clear)) : DEFAULTS.clear;
  if (!["glass", "black"].includes(settings.style)) settings.style = DEFAULTS.style;
  if (!["celsius", "fahrenheit"].includes(settings.temperatureUnit)) settings.temperatureUnit = DEFAULTS.temperatureUnit;
  if (!backgrounds.has(settings.bg)) settings.bg = DEFAULTS.bg;
  return settings;
}
