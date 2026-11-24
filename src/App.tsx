import { useCallback, useEffect, useRef, useState } from "react";
import Ring from "./components/Ring";
import Panel from "./components/Panel";
import Picker from "./components/Picker";
import Settings from "./components/Settings";
import { Close, Gear, Plus } from "./components/Icons";
import { type City } from "./lib/cities";
import { withLocalWeather } from "./domain/city.ts";
import { useClock } from "./hooks/useClock.ts";
import { useCities } from "./hooks/useCities.ts";
import { bgUrl } from "./lib/backgrounds";
import { keyOf } from "./lib/search";
import { useSettings } from "./lib/settings";
import { useWeather } from "./lib/weather";
import { closeApp, drag, inTauri, pinToDesktop, setBlur, setLayout } from "./lib/win";

const BG_KEY = "orbit.bg.custom";
const scrollBehavior = (): ScrollBehavior => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
type Mode = "full" | "panel" | "picker" | "settings";

// Base (100%) size of the widget in each state. The window is this size times the user's scale.
function dims(mode: Mode, n: number, hasHours: boolean): [number, number] {
  const v = Math.min(Math.max(n, 1), 4);
  if (mode === "full") return [Math.max(360, 40 + 120 * v), 188];
  if (mode === "panel") return [Math.max(360, 40 + 120 * v), hasHours ? 456 : 350];
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
  const [dismissedSettingsError, dismissSettingsError] = useState(false);
  const leave = useRef<number>();
  const strip = useRef<HTMLDivElement>(null);
  const weather = useWeather(S.weather ? cities : [], S.temperatureUnit);
  const fmt = { h24: S.h24, ampm: S.ampm, utc: S.utc };
  const reportNativeError = useCallback((error: unknown) => {
    console.error("ORBIT window operation failed", error);
    setNativeError("A window setting could not be applied. Try reopening ORBIT.");
  }, []);
  useEffect(() => { void pinToDesktop().catch(reportNativeError); }, [reportNativeError]);
  useEffect(() => { void setBlur(S.blur && S.style === "glass").catch(reportNativeError); }, [S.blur, S.style, reportNativeError]);
  useEffect(() => () => clearTimeout(leave.current), []);

  const n = cities.length;
  const current = cities.find((city) => city.id === focus);
  const cw = current ? weather[keyOf(current)] : undefined;
  const hasHours = S.weather && !!cw?.data?.hours.some((hour) => hour.time > now.getTime() / 1000);
  const panelOpen = view === "rings" && !!current;
  const mode: Mode = view === "picker" ? "picker" : view === "settings" ? "settings" : panelOpen ? "panel" : "full";
  const message = nativeError || notice || (!dismissedSettingsError ? settingsError : null);
  const [W, baseHeight] = dims(mode, n, hasHours);
  const H = baseHeight + (message ? 64 : 0);
  useEffect(() => { void setLayout(S.scale, W, H).catch(reportNativeError); }, [S.scale, W, H, reportNativeError]);

  const enter = useCallback((id: string) => { clearTimeout(leave.current); setFocus(id); }, []);
  const over = () => clearTimeout(leave.current);
  const out = () => { clearTimeout(leave.current); leave.current = window.setTimeout(() => {
    if (!strip.current?.contains(document.activeElement)) setFocus(null);
  }, 350); };

  const closeView = () => {
    const control = view === "settings" ? "settings" : "add";
    setView("rings");
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-control="${control}"]`)?.focus());
  };
  const chooseLocalWeather = () => { setLocalWeatherPicker(true); setView("picker"); };

  const add = (c: City) => {
    setCities((list) => localWeatherPicker
      ? list.map((city) => city.kind === "local" ? withLocalWeather(city, c) : city)
      : list.some((city) => city.id === c.id) ? list : [...list, c]);
    setView("rings");
    requestAnimationFrame(() => {
      const button = Array.from(strip.current?.querySelectorAll<HTMLButtonElement>(".ring-item") ?? []).find((item) => item.dataset.cityId === (localWeatherPicker ? "local" : c.id));
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

  // Drag the bottom-right grip to resize. Uses the pointer position from when you pressed,
  // so the size follows your cursor smoothly and never feeds back into itself.
  const grip = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const x0 = e.screenX, y0 = e.screenY, s0 = S.scale, w0 = W * s0, h0 = H * s0;
    let raf = 0;
    const move = (m: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const k = ((w0 + (m.screenX - x0)) / w0 + (h0 + (m.screenY - y0)) / h0) / 2;
        set({ scale: Math.round(Math.min(1.5, Math.max(0.7, s0 * k)) * 100) / 100 });
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const black = S.style === "black";
  const bg = black ? "" : S.bg === "custom" ? (custom ? `url(${custom})` : "") : S.bg !== "none" ? bgUrl(S.bg) : "";
  const tint = black ? 1 : Math.max(0.04, 0.94 - 0.0088 * S.clear);
  const vis = Math.min(n, 4);

  return (
    <div
      className={`shell ${black ? "black" : "glass"} m-${mode} ${inTauri ? "" : "web"}`}
      style={{ ...(inTauri ? {} : { width: W, height: H }), "--tint": tint } as React.CSSProperties}
      onMouseEnter={over}
      onMouseLeave={out}
      onKeyDown={(e) => { if (e.key === "Escape" && view === "rings") setFocus(null); }}
      onMouseDown={(e) => {
        // drag the widget from anywhere that isn't a control
        if (e.button === 0 && !S.lock && !(e.target as HTMLElement).closest("button,input,a,.hours,.results,.sbody,.grip")) void drag().catch(reportNativeError);
      }}
    >
      {bg && <div className="bg" style={{ backgroundImage: bg }} />}
      <div className="tint" />
      {!black && <div className="sheen" />}

      {view === "picker" && <Picker cities={cities} utc={S.utc} weatherLocation={localWeatherPicker} onAdd={add} onRemove={remove} onMove={moveCity} onClose={closeView} />}
      {view === "settings" && <Settings s={S} set={set} custom={custom} onCustom={saveCustom} local={cities.find((city) => city.kind === "local")} onChooseLocalWeather={chooseLocalWeather} onClose={closeView} />}

      {view === "rings" && (
        <>
          <div className="hud">
            <button data-control="add" aria-label="Add a city" title="Add a city" onClick={() => { setLocalWeatherPicker(false); setView("picker"); }}><Plus /></button>
            <button data-control="settings" aria-label="Settings" title="Settings" onClick={() => setView("settings")}><Gear /></button>
            {inTauri && <button aria-label="Quit ORBIT" title="Quit ORBIT" onClick={() => { void closeApp().catch(reportNativeError); }}><Close /></button>}
          </div>
          <div
            className="strip" ref={strip}
            style={{ width: 120 * vis + 8 }}
            onWheel={(e) => { if (!e.deltaX) strip.current?.scrollBy({ left: e.deltaY * 2, behavior: scrollBehavior() }); }}
          >
            {cities.map((c) => (
              <Ring key={keyOf(c)} city={c} now={now} homeTz={home} fmt={fmt}
                weather={S.weather ? weather[keyOf(c)] : undefined} active={panelOpen && focus === c.id} onEnter={() => enter(c.id)} />
            ))}
          </div>
          {panelOpen && current && (
            <Panel key={keyOf(current)} city={current} now={now} home={home} h24={S.h24} utc={S.utc} weatherOn={S.weather} weather={cw} onChooseWeather={chooseLocalWeather} />
          )}
          {!S.lock && <div className="grip" title="Drag to resize" onPointerDown={grip} />}
        </>
      )}
      {message && <div className="notice" role="status"><span>{message}</span><button aria-label="Dismiss message" onClick={() => {
        if (nativeError) setNativeError(null); else if (notice) setNotice(null); else dismissSettingsError(true);
      }}>×</button></div>}
    </div>
  );
}
