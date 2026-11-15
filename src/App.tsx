import { useCallback, useEffect, useRef, useState } from "react";
import Ring from "./components/Ring";
import Panel from "./components/Panel";
import Picker from "./components/Picker";
import Settings from "./components/Settings";
import { Close, Gear, Minus, Pin, Plus } from "./components/Icons";
import { defaultCities, localTz, type City } from "./lib/cities";
import { bgUrl } from "./lib/backgrounds";
import { keyOf } from "./lib/search";
import { useSettings } from "./lib/settings";
import { useWeather } from "./lib/weather";
import { closeApp, drag, inTauri, minimize, resize, setBlur, setPin } from "./lib/win";

const CITIES_KEY = "orbit.cities.v2";
const BG_KEY = "orbit.bg.custom";
type Mode = "mini" | "full" | "panel" | "picker" | "settings";

function dims(mode: Mode, n: number): [number, number] {
  const v = Math.min(Math.max(n, 1), 4);
  if (mode === "mini") return [32 + 72 * v, 92];
  if (mode === "full") return [Math.max(360, 40 + 120 * v), 188];
  if (mode === "panel") return [Math.max(360, 40 + 120 * v), 344];
  return [520, mode === "settings" ? 540 : 470];
}

function loadCities(): City[] {
  try {
    const saved = JSON.parse(localStorage.getItem(CITIES_KEY) || "null") as City[] | null;
    if (saved?.length) return saved.map((c) => (c.name === "Local" ? { ...c, tz: localTz() } : c));
  } catch { /* fall through */ }
  return defaultCities();
}

export default function App() {
  const [cities, setCities] = useState<City[]>(loadCities);
  const [S, set] = useSettings();
  const [custom, setCustom] = useState<string | null>(() => { try { return localStorage.getItem(BG_KEY); } catch { return null; } });
  const [now, setNow] = useState(() => new Date());
  const [view, setView] = useState<"rings" | "picker" | "settings">("rings");
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);
  const leave = useRef<number>();
  const strip = useRef<HTMLDivElement>(null);
  const weather = useWeather(S.weather ? cities : []);
  const home = localTz();
  const fmt = { h24: S.h24, ampm: S.ampm, utc: S.utc };

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 5000); return () => clearInterval(id); }, []);
  useEffect(() => { try { localStorage.setItem(CITIES_KEY, JSON.stringify(cities)); } catch { /* ignore */ } }, [cities]);
  useEffect(() => { setPin(S.pin); }, [S.pin]);
  useEffect(() => { setBlur(S.blur); }, [S.blur]);

  const n = cities.length;
  const panelOpen = view === "rings" && hover && focus !== null && focus < n;
  const mode: Mode = view === "picker" ? "picker" : view === "settings" ? "settings"
    : S.minimal && !hover ? "mini" : panelOpen ? "panel" : "full";
  const [W, H] = dims(mode, n);
  useEffect(() => { resize(W * S.scale, H * S.scale); }, [W, H, S.scale]);

  const enter = useCallback((i: number) => { clearTimeout(leave.current); setHover(true); setFocus(i); }, []);
  const over = () => { clearTimeout(leave.current); setHover(true); };
  const out = () => { leave.current = window.setTimeout(() => { setHover(false); setFocus(null); }, 350); };

  const add = (c: City) => {
    setCities((l) => [...l, c]);
    setView("rings");
    requestAnimationFrame(() => strip.current?.scrollTo({ left: 9999, behavior: "smooth" }));
  };
  const remove = (i: number) => setCities((l) => (l.length > 1 ? l.filter((_, j) => j !== i) : l));
  const saveCustom = (d: string) => { setCustom(d); try { localStorage.setItem(BG_KEY, d); } catch { /* too big: keep in memory */ } };

  // drag the bottom-right grip to resize the whole widget
  const grip = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const x0 = e.screenX, s0 = S.scale, w0 = W * s0;
    const move = (m: PointerEvent) => {
      const s = Math.min(1.5, Math.max(0.7, (s0 * (w0 + (m.screenX - x0))) / w0));
      set({ scale: Math.round(s * 100) / 100 });
    };
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };

  const bg = S.bg === "custom" ? (custom ? `url(${custom})` : "") : S.bg !== "none" ? bgUrl(S.bg) : "";
  const black = S.style === "black";
  const tint = black ? 1 : Math.max(0.04, 0.94 - 0.0088 * S.clear);
  const key = (c: City) => keyOf(c);
  const current = focus !== null ? cities[focus] : undefined;
  const vis = Math.min(n, 4);
  const mini = mode === "mini";

  return (
    <div
      className={`shell ${black ? "black" : "glass"} m-${mode} ${inTauri ? "" : "web"}`}
      style={{ width: W, height: H, zoom: S.scale, "--tint": tint } as React.CSSProperties}
      onMouseEnter={over}
      onMouseLeave={out}
      onMouseDown={(e) => {
        if (e.button === 0 && !S.lock && !(e.target as HTMLElement).closest("button,input,.ring-item,.hours,.results,.sbody,.grip")) drag();
      }}
    >
      {!black && bg && <div className="bg" style={{ backgroundImage: bg, opacity: S.bgStrength / 100 }} />}
      <div className="tint" />
      {!black && <div className="sheen" />}

      {view === "picker" && <Picker cities={cities} utc={S.utc} onAdd={add} onRemove={remove} onClose={() => setView("rings")} />}
      {view === "settings" && <Settings s={S} set={set} custom={custom} onCustom={saveCustom} onClose={() => setView("rings")} />}

      {view === "rings" && (
        <>
          {!mini && (
            <div className="hud">
              <button title="Add a city" onClick={() => setView("picker")}><Plus /></button>
              <button title="Settings" onClick={() => setView("settings")}><Gear /></button>
              <button title={S.pin === "desktop" ? "Pinned to desktop (click to float on top)" : "Floating on top (click to pin to desktop)"}
                className={S.pin === "desktop" ? "lit" : ""} onClick={() => set({ pin: S.pin === "desktop" ? "float" : "desktop" })}><Pin on={S.pin === "desktop"} /></button>
              {inTauri && <button title="Minimize" onClick={minimize}><Minus /></button>}
              {inTauri && <button title="Close" onClick={closeApp}><Close /></button>}
            </div>
          )}
          <div
            className={`strip ${mini ? "mini" : ""}`} ref={strip}
            style={{ width: (mini ? 72 : 120) * vis + 8 }}
            onWheel={(e) => { if (!e.deltaX) strip.current?.scrollBy({ left: e.deltaY * 2, behavior: "smooth" }); }}
          >
            {cities.map((c, i) => (
              <Ring key={key(c)} city={c} now={now} homeTz={home} fmt={fmt}
                weather={S.weather ? weather[key(c)] : null} active={panelOpen && focus === i} onEnter={() => (mini ? over() : enter(i))} />
            ))}
          </div>
          {panelOpen && current && <Panel key={key(current)} city={current} h24={S.h24} weather={S.weather ? weather[key(current)] : null} />}
          {!mini && !S.lock && <div className="grip" title="Drag to resize" onPointerDown={grip} />}
        </>
      )}
    </div>
  );
}
