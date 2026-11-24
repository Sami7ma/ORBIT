import { useEffect, useId, useRef, useState } from "react";
import { BACKGROUNDS, bgUrl, loadImage } from "../lib/backgrounds";
import { DEFAULTS, type Settings as S } from "../lib/settings";
import type { City } from "../domain/city.ts";
import { getPlatform } from "../lib/win";

type Props = { s: S; set: (p: Partial<S>) => void; custom: string | null; onCustom: (d: string) => void; local?: City; onChooseLocalWeather: () => void; onClose: () => void };

const Seg = <T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) => (
  <div className="seg">{options.map(([v, l]) => <button key={v} aria-pressed={v === value} className={v === value ? "on" : ""} onClick={() => onChange(v)}>{l}</button>)}</div>
);
const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => {
  const id = useId();
  return <div className="srow" role="group" aria-labelledby={id}><div><b id={id}>{label}</b>{hint && <small>{hint}</small>}</div>{children}</div>;
};
const Switch = ({ label, on, onChange, disabled }: { label: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <button aria-label={label} className={`switch ${on ? "on" : ""}`} disabled={disabled} onClick={() => onChange(!on)} role="switch" aria-checked={on}><i /></button>
);

/** The size only applies when you let go. Resizing live would move the slider away from your cursor. */
function SizeSlider({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [v, setV] = useState(Math.round(value * 100));
  useEffect(() => setV(Math.round(value * 100)), [value]);
  const commit = () => onCommit(v / 100);
  return (
    <div className="sizebox">
      <input aria-label="Widget size" aria-valuetext={`${v} percent`} type="range" min={70} max={150} step={5} value={v}
        onChange={(e) => setV(+e.target.value)} onPointerUp={commit} onKeyUp={commit} onBlur={commit} />
      <small>{v}%</small>
    </div>
  );
}

export default function Settings({ s, set, custom, onCustom, local, onChooseLocalWeather, onClose }: Props) {
  const file = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [canBlur, setCanBlur] = useState(false);
  useEffect(() => {
    let active = true;
    void getPlatform().then((platform) => { if (active) setCanBlur(platform === "windows"); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const glass = s.style === "glass";
  return (
    <section className="settings" aria-label="Settings" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="picker-top"><strong className="stitle">Settings</strong><button autoFocus className="pill" onClick={onClose}>Done</button></div>
      <div className="sbody">
        <h4>Look</h4>
        <Row label="Style"><Seg value={s.style} onChange={(style) => set({ style })} options={[["glass", "Liquid glass"], ["black", "Solid black"]]} /></Row>
        {glass && <>
          <Row label="Transparency" hint="Slide right to see more of your desktop or background image">
            <input aria-label="Transparency" type="range" min={0} max={100} value={s.clear} onChange={(e) => set({ clear: +e.target.value })} />
          </Row>
          <Row label="Blur what's behind" hint={canBlur ? undefined : "Desktop blur is available on Windows"}><Switch label="Blur what's behind" on={canBlur && s.blur} disabled={!canBlur} onChange={(blur) => set({ blur })} /></Row>
          <div className="bgs">
            <button className={`bgt none ${s.bg === "none" ? "on" : ""}`} onClick={() => set({ bg: "none" })}>None</button>
            {BACKGROUNDS.map((b) => (
              <button key={b.id} aria-label={b.name} aria-pressed={s.bg === b.id} title={b.name} className={`bgt ${s.bg === b.id ? "on" : ""}`} style={{ backgroundImage: bgUrl(b.id) }} onClick={() => set({ bg: b.id })} />
            ))}
            {custom && <button aria-label="Your image" title="Your image" className={`bgt ${s.bg === "custom" ? "on" : ""}`} style={{ backgroundImage: `url(${custom})` }} onClick={() => set({ bg: "custom" })} />}
            <button className="bgt add" title="Use your own image" onClick={() => file.current?.click()}>+ Yours</button>
            <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setImageError(null);
              try { onCustom(await loadImage(f)); set({ bg: "custom" }); } catch { setImageError("That image could not be loaded. Try a smaller PNG or JPEG."); }
            }} />
          </div>
          {imageError && <p className="picker-hint" role="alert">{imageError}</p>}
        </>}

        <h4>Size</h4>
        <Row label="Widget size" hint="Or drag the grip in the bottom-right corner"><SizeSlider value={s.scale} onCommit={(scale) => set({ scale })} /></Row>
        <Row label="Lock position" hint="Stops accidental dragging"><Switch label="Lock position" on={s.lock} onChange={(lock) => set({ lock })} /></Row>

        <h4>Time</h4>
        <Row label="Clock"><Seg value={s.h24 ? "24" : "12"} onChange={(v) => set({ h24: v === "24" })} options={[["12", "12-hour"], ["24", "24-hour"]]} /></Row>
        <Row label="Show AM / PM"><Switch label="Show AM / PM" on={s.ampm && !s.h24} disabled={s.h24} onChange={(ampm) => set({ ampm })} /></Row>
        <Row label="Offset labels"><Seg value={s.utc ? "utc" : "gmt"} onChange={(v) => set({ utc: v === "utc" })} options={[["gmt", "GMT"], ["utc", "UTC"]]} /></Row>

        <h4>Weather</h4>
        <Row label="Show weather" hint="Badges, scenes and the hourly forecast"><Switch label="Show weather" on={s.weather} onChange={(weather) => set({ weather })} /></Row>
        <Row label="Temperature"><Seg value={s.temperatureUnit} onChange={(temperatureUnit) => set({ temperatureUnit })} options={[["celsius", "°C"], ["fahrenheit", "°F"]]} /></Row>
        {local && <Row label="Local weather" hint={local.weatherLocation ?? "Choose a location for Local time"}><button className="pill" onClick={onChooseLocalWeather}>Choose</button></Row>}
        <p className="attribution">Weather and city search by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></p>

        <div className="reset"><button className="pill" onClick={() => set({ ...DEFAULTS })}>Reset settings</button></div>
      </div>
    </section>
  );
}
