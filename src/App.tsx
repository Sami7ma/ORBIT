import { useCallback, useEffect, useRef, useState } from "react";
import Ring from "./components/Ring";
import Panel from "./components/Panel";
import Picker from "./components/Picker";
import Settings from "./components/Settings";
import ResizeHandles from "./components/ResizeHandles";
import { fitViewport, viewportBounds, viewportRows, type Viewport } from "./platform/viewport.ts";
import { Close, Gear, Plus, Lock, Pin } from "./components/Icons";
import { type City } from "./lib/cities";
import { withLocalWeather } from "./domain/city.ts";
import { useClock } from "./hooks/useClock.ts";
import { useCities } from "./hooks/useCities.ts";
import { bgUrl } from "./lib/backgrounds";
import { keyOf } from "./lib/search";
import { useSettings } from "./lib/settings";
import { useWeather } from "./lib/weather";
import { closeApp, drag, inTauri, setPinned, setBlur, setLayout, observeWindowSize } from "./lib/win";

const BG_KEY = "orbit.bg.custom";
const scrollBehavior = (): ScrollBehavior => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
type Mode = "full" | "panel" | "picker" | "settings";

// Dimensions stay in logical pixels; scale is an independent appearance preference.
function dims(mode: Mode, viewport: Viewport, hasHours: boolean): [number, number] {
  if (mode === "full") return [viewport.width, viewport.height];
  if (mode === "panel") return [Math.max(360, viewport.width), viewport.height + (hasHours ? 268 : 162)];
  return [520, mode === "settings" ? 540 : 470];
}

export default function App() {
  const { now, home } = useClock();
  const { cities, setCities, notice, setNotice } = useCities(home);
  const [S, set, settingsError] = useSettings();
  const [custom, setCustom] = useState<string | null>(() => { try { return localStorage.getItem(BG_KEY); } catch { return null; } });
  const [view, setView] = useState<"rings" | "picker" | "settings">("rings");
  const [focus, setFocus] = useState<string | null>(null);
  const [localWeatherPicker, setLocalWeatherPicker] = useState(false);
  const [nativeError, setNativeError] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(true);
  const [dismissedSettingsError, dismissSettingsError] = useState(false);
  const leave = useRef<number>();
  const strip = useRef<HTMLDivElement>(null);
  const weather = useWeather(S.weather ? cities : [], S.temperatureUnit);
  const fmt = { h24: S.h24, ampm: S.ampm, utc: S.utc };
  const reportNativeError = useCallback((error: unknown) => {
    console.error("ORBIT window operation failed", error);
    setNativeError("A window setting could not be applied. Try reopening ORBIT.");
  }, []);
  useEffect(() => {
    let current = true;
    setPinBusy(true);
    void setPinned(S.pinned).catch((error) => {
      if (!current) return;
      console.error("ORBIT pin could not be applied", error);
      setNativeError("Always on top could not be applied. Try the pin again.");
      if (S.pinned) set({ pinned: false });
    }).finally(() => { if (current) setPinBusy(false); });
    return () => { current = false; };
  }, [S.pinned, set]);
  useEffect(() => { void setBlur(S.blur && S.style === "glass").catch(reportNativeError); }, [S.blur, S.style, reportNativeError]);
  useEffect(() => () => clearTimeout(leave.current), []);

  const n = cities.length;
  const current = cities.find((city) => city.id === focus);
  const cw = current ? weather[keyOf(current)] : undefined;
  const hasHours = S.weather && !!cw?.data?.hours.some((hour) => hour.time > now.getTime() / 1000);
  const panelOpen = view === "rings" && !!current;
  const mode: Mode = view === "picker" ? "picker" : view === "settings" ? "settings" : panelOpen ? "panel" : "full";
  const message = nativeError || notice || (!dismissedSettingsError ? settingsError : null);
  const viewport = fitViewport({ width: S.viewportWidth, height: S.viewportHeight }, n);
  const resizeViewport = useCallback((size: Viewport) => set({ viewportWidth: size.width, viewportHeight: size.height }), [set]);
  const [W, baseHeight] = dims(mode, viewport, hasHours);
  const H = baseHeight + (message ? 64 : 0);
  const nativeResize = useRef<{ width: number; height: number } | null>(null);
  const sizeContext = useRef({ view, scale: S.scale, extraHeight: H - viewport.height, count: n, locked: S.lock });
  sizeContext.current = { view, scale: S.scale, extraHeight: H - viewport.height, count: n, locked: S.lock };
  useEffect(() => {
    let disposed = false, stop: (() => void) | undefined;
    void observeWindowSize((width, height) => {
      const context = sizeContext.current;
      if (context.view !== "rings" || context.locked) return;
      const next = fitViewport({ width: width / context.scale, height: height / context.scale - context.extraHeight }, context.count);
      nativeResize.current = { width, height };
      set({ viewportWidth: next.width, viewportHeight: next.height });
    }).then((unlisten) => { if (disposed) unlisten(); else stop = unlisten; }).catch(reportNativeError);
    return () => { disposed = true; stop?.(); };
  }, [set, reportNativeError]);
  const limits = viewportBounds(n);
  const extra = H - viewport.height;
  const minWidth = mode === "panel" ? Math.max(360, limits.minWidth) : limits.minWidth;
  const bounds = view === "rings" && !S.lock
    ? { ...limits, minWidth, maxWidth: Math.max(minWidth, limits.maxWidth), minHeight: limits.minHeight + extra, maxHeight: limits.maxHeight + extra }
    : { minWidth: W, maxWidth: W, minHeight: H, maxHeight: H };
  useEffect(() => {
    const native = nativeResize.current;
    nativeResize.current = null;
    // The compositor already applied a manual resize. Do not send an older size
    // back while the user is still dragging an edge.
    if (native && Math.abs(native.width - W * S.scale) <= 1 && Math.abs(native.height - H * S.scale) <= 1) return;
    void setLayout(S.scale, W, H, bounds).catch(reportNativeError);
  }, [S.scale, W, H, bounds.minWidth, bounds.minHeight, bounds.maxWidth, bounds.maxHeight, reportNativeError]);
  useEffect(() => {
    const collapse = () => setFocus(null);
    window.addEventListener("blur", collapse);
    return () => window.removeEventListener("blur", collapse);
  }, []);

  const activate = useCallback((id: string) => { clearTimeout(leave.current); setFocus((previous) => previous === id ? null : id); }, []);
  const over = () => clearTimeout(leave.current);
  const out = () => { clearTimeout(leave.current); leave.current = window.setTimeout(() => {
    setFocus(null);
  }, 350); };

  const closeView = () => {
    const control = view === "settings" ? "settings" : "add";
    setFocus(null);
    setView("rings");
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-control="${control}"]`)?.focus());
  };
  const chooseLocalWeather = () => { setLocalWeatherPicker(true); setView("picker"); };

  const add = (c: City) => {
    setCities((list) => localWeatherPicker
      ? list.map((city) => city.kind === "local" ? withLocalWeather(city, c) : city)
      : list.some((city) => city.id === c.id) ? list : [...list, c]);
    setView("rings");
    setFocus(localWeatherPicker ? "local" : null);
    requestAnimationFrame(() => {
      const button = Array.from(strip.current?.querySelectorAll<HTMLButtonElement>(".clock-trigger") ?? []).find((item) => item.dataset.cityId === (localWeatherPicker ? "local" : c.id));
      button?.focus(); button?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: scrollBehavior() });
    });
  };
  const remove = (i: number) => setCities((l) => (l.length > 1 ? l.filter((_, j) => j !== i) : l));
  const moveCity = (index: number, direction: -1 | 1) => setCities((list) => {
    const next = list.slice(), destination = index + direction;
    if (destination < 0 || destination >= list.length) return list;
    [next[index], next[destination]] = [next[destination], next[index]];
    return next;
  });
  const saveCustom = (d: string) => { setCustom(d); try { localStorage.setItem(BG_KEY, d); } catch { setNotice("Your image could not be saved. It will stay in this session."); } };

  const black = S.style === "black";
  const bg = black ? "" : S.bg === "custom" ? (custom ? `url(${custom})` : "") : S.bg !== "none" ? bgUrl(S.bg) : "";
  const tint = black ? 1 : Math.max(0.04, 0.94 - 0.0088 * S.clear);
  const rows = viewportRows(viewport.height);

  return (
    <div
      className={`shell ${black ? "black" : "glass"} m-${mode} ${inTauri ? "" : "web"}`}
      style={{ ...(inTauri ? {} : { width: W, height: H }), "--tint": tint } as React.CSSProperties}
      onMouseEnter={over}
      onMouseLeave={out}
      onKeyDown={(e) => { if (e.key === "Escape" && view === "rings") setFocus(null); }}
      onMouseDown={(e) => {
        // drag the widget from anywhere that isn't a control
        if (e.button === 0 && !S.lock && !(e.target as HTMLElement).closest("button,input,a,.hours,.results,.sbody,.resize-edge,.panel")) void drag().catch(reportNativeError);
      }}
    >
      {bg && <div className="bg" style={{ backgroundImage: bg }} />}
      <div className="tint" />
      {!black && <div className="sheen" />}

      {view === "picker" && <Picker cities={cities} utc={S.utc} weatherLocation={localWeatherPicker} onAdd={add} onRemove={remove} onMove={moveCity} onClose={closeView} />}
      {view === "settings" && <Settings s={S} set={set} custom={custom} onCustom={saveCustom} local={cities.find((city) => city.kind === "local")} onChooseLocalWeather={chooseLocalWeather} onClose={closeView} />}

      {view === "rings" && (
        <>
          <div className={`hud quick-controls ${S.lock || S.pinned ? "has-active" : ""}`}>
            <button aria-label="Lock position" aria-pressed={S.lock} title={S.lock ? "Unlock position and resizing" : "Lock position and resizing"} className={S.lock ? "lit" : ""} onClick={() => set({ lock: !S.lock })}><Lock on={S.lock} /></button>
            <button aria-label="Always on top" aria-pressed={S.pinned} title={S.pinned ? "Unpin from top" : "Keep above other windows"} disabled={pinBusy} className={S.pinned ? "lit" : ""} onClick={() => set({ pinned: !S.pinned })}><Pin on={S.pinned} /></button>
          </div>
          <div className="hud main-controls">
            <button data-control="add" aria-label="Add a city" title="Add a city" onClick={() => { setLocalWeatherPicker(false); setFocus(null); setView("picker"); }}><Plus /></button>
            <button data-control="settings" aria-label="Settings" title="Settings" onClick={() => { setFocus(null); setView("settings"); }}><Gear /></button>
            {inTauri && <button aria-label="Quit ORBIT" title="Quit ORBIT" onClick={() => { void closeApp().catch(reportNativeError); }}><Close /></button>}
          </div>
          <div
            className="strip" ref={strip}
            style={{ width: "100%", height: viewport.height - 26, gridTemplateRows: `repeat(${rows}, 142px)` }}
            onWheel={(e) => { if (!e.deltaX) strip.current?.scrollBy({ left: e.deltaY * 2, behavior: scrollBehavior() }); }}
          >
            {cities.map((c) => (
              <Ring key={keyOf(c)} city={c} now={now} homeTz={home} fmt={fmt}
                weather={S.weather ? weather[keyOf(c)] : undefined} active={panelOpen && focus === c.id} onActivate={() => activate(c.id)} />
            ))}
          </div>
          {panelOpen && current && (
            <Panel key={keyOf(current)} city={current} now={now} home={home} h24={S.h24} utc={S.utc} weatherOn={S.weather} weather={cw} onChooseWeather={chooseLocalWeather} onClose={() => setFocus(null)} />
          )}
          {!S.lock && <ResizeHandles viewport={viewport} count={n} scale={S.scale} onResize={resizeViewport} onError={reportNativeError} />}
        </>
      )}
      {message && <div className="notice" role="status"><span>{message}</span><button aria-label="Dismiss message" onClick={() => {
        if (nativeError) setNativeError(null); else if (notice) setNotice(null); else dismissSettingsError(true);
      }}>×</button></div>}
    </div>
  );
}
