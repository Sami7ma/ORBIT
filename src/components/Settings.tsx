import { useRef } from "react";
import { BACKGROUNDS, bgUrl, loadImage } from "../lib/backgrounds";
import type { Settings as S } from "../lib/settings";

type Props = { s: S; set: (p: Partial<S>) => void; custom: string | null; onCustom: (d: string) => void; onClose: () => void };

const Seg = <T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) => (
  <div className="seg">{options.map(([v, l]) => <button key={v} className={v === value ? "on" : ""} onClick={() => onChange(v)}>{l}</button>)}</div>
);
const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="srow"><div><b>{label}</b>{hint && <small>{hint}</small>}</div>{children}</div>
);
const Switch = ({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <button className={`switch ${on ? "on" : ""}`} disabled={disabled} onClick={() => onChange(!on)} role="switch" aria-checked={on}><i /></button>
);

export default function Settings({ s, set, custom, onCustom, onClose }: Props) {
  const file = useRef<HTMLInputElement>(null);
  const glass = s.style === "glass";
  return (
    <div className="settings" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="picker-top"><strong className="stitle">Settings</strong><button className="pill" onClick={onClose}>Done</button></div>
      <div className="sbody">
        <h4>Look</h4>
        <Row label="Style"><Seg value={s.style} onChange={(style) => set({ style })} options={[["glass", "Liquid glass"], ["black", "Solid black"]]} /></Row>
        {glass && <>
          <Row label="Transparency" hint="Left is dense, right shows more of your desktop">
            <input type="range" min={0} max={100} value={s.clear} onChange={(e) => set({ clear: +e.target.value })} />
          </Row>
          <Row label="Blur what's behind"><Switch on={s.blur} onChange={(blur) => set({ blur })} /></Row>
          <div className="bgs">
            <button className={`bgt none ${s.bg === "none" ? "on" : ""}`} onClick={() => set({ bg: "none" })}>None</button>
            {BACKGROUNDS.map((b) => (
              <button key={b.id} title={b.name} className={`bgt ${s.bg === b.id ? "on" : ""}`} style={{ backgroundImage: bgUrl(b.id) }} onClick={() => set({ bg: b.id })} />
            ))}
            {custom && <button title="Your image" className={`bgt ${s.bg === "custom" ? "on" : ""}`} style={{ backgroundImage: `url(${custom})` }} onClick={() => set({ bg: "custom" })} />}
            <button className="bgt add" title="Use your own image" onClick={() => file.current?.click()}>+ Yours</button>
            <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try { onCustom(await loadImage(f)); set({ bg: "custom" }); } catch { /* ignore bad file */ }
            }} />
          </div>
          {s.bg !== "none" && <Row label="Image strength"><input type="range" min={20} max={100} value={s.bgStrength} onChange={(e) => set({ bgStrength: +e.target.value })} /></Row>}
        </>}

        <h4>Size and behavior</h4>
        <Row label="Size" hint="Or drag the corner grip"><input type="range" min={70} max={150} value={Math.round(s.scale * 100)} onChange={(e) => set({ scale: +e.target.value / 100 })} /></Row>
        <Row label="Minimal until hovered" hint="Tiny rings, grows when you point at it"><Switch on={s.minimal} onChange={(minimal) => set({ minimal })} /></Row>
        <Row label="Pin"><Seg value={s.pin} onChange={(pin) => set({ pin })} options={[["float", "Float on top"], ["desktop", "On desktop"]]} /></Row>
        <Row label="Lock position"><Switch on={s.lock} onChange={(lock) => set({ lock })} /></Row>

        <h4>Time</h4>
        <Row label="Clock"><Seg value={s.h24 ? "24" : "12"} onChange={(v) => set({ h24: v === "24" })} options={[["12", "12-hour"], ["24", "24-hour"]]} /></Row>
        <Row label="Show AM / PM"><Switch on={s.ampm && !s.h24} disabled={s.h24} onChange={(ampm) => set({ ampm })} /></Row>
        <Row label="Offset labels"><Seg value={s.utc ? "utc" : "gmt"} onChange={(v) => set({ utc: v === "utc" })} options={[["gmt", "GMT"], ["utc", "UTC"]]} /></Row>

        <h4>Weather</h4>
        <Row label="Show weather" hint="Badges, scenes and hourly forecast"><Switch on={s.weather} onChange={(weather) => set({ weather })} /></Row>
      </div>
    </div>
  );
}
