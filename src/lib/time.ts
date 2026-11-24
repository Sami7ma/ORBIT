const REGION: Record<string, string> = {
  "America/New_York": "Eastern", "America/Detroit": "Eastern", "America/Toronto": "Eastern",
  "America/Chicago": "Central", "America/Mexico_City": "Central",
  "America/Denver": "Mountain", "America/Phoenix": "Mountain", "America/Edmonton": "Mountain",
  "America/Los_Angeles": "Pacific", "America/Vancouver": "Pacific",
  "America/Anchorage": "Alaska", "Pacific/Honolulu": "Hawaii", "America/Halifax": "Atlantic",
};

export type Fmt = { h24: boolean; ampm: boolean; utc: boolean };

function part(tz: string, d: Date, style: "short" | "longOffset"): string {
  try {
    return (
      new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: style })
        .formatToParts(d)
        .find((p) => p.type === "timeZoneName")?.value ?? ""
    );
  } catch { return ""; }
}

/** "Eastern Time" for North American zones, otherwise "GMT+3" (or "UTC+3"). */
export function zoneLabel(tz: string, d = new Date(), utc = false): string {
  const r = REGION[tz];
  if (r) return `${r} Time`;
  const s = part(tz, d, "short") || tz;
  return utc ? s.replace(/^GMT/, "UTC") : s;
}

const meta = new Map<string, { day: number; text: string }>();
/** Everything someone might type to find a zone: names, abbreviations, "gmt+3", "utc+5:30". */
export function searchText(tz: string, city: string, country: string, now = new Date()): string {
  const day = Math.floor(now.getTime() / 3_600_000);
  if (meta.get(tz)?.day !== day) {
    const m = /GMT([+-])(\d\d):(\d\d)/.exec(part(tz, now, "longOffset"));
    let off = "gmt+0 utc+0 utc gmt";
    if (m) {
      const h = Number(m[2]), mm = m[3];
      const a = `${m[1]}${h}${mm !== "00" ? ":" + mm : ""}`;
      off = `gmt${a} utc${a} gmt${m[1]}${m[2]}:${mm} utc${m[1]}${m[2]}:${mm}`;
    }
    meta.set(tz, { day, text: `${tz.replace(/[_/]/g, " ")} ${REGION[tz] ?? ""} ${part(tz, now, "short")} ${off}`.toLowerCase() });
  }
  return `${city} ${country} ${meta.get(tz)?.text ?? ""}`.toLowerCase();
}

const hm = (tz: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", hour: "numeric", minute: "numeric" });
function calendarDay(tz: string, now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)!.value);
  return Date.UTC(get("year"), get("month") - 1, get("day")) / 86_400_000;
}

export function dayShiftText(days: number): string {
  if (days === 0) return "";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return `${Math.abs(days)} days ${days > 0 ? "ahead" : "behind"}`;
}

export const sameMinute = (a: Date, b: Date) => Math.floor(a.getTime() / 60_000) === Math.floor(b.getTime() / 60_000);

export type Clock = { hour: string; minute: string; period: "AM" | "PM"; frac: number; dayShift: number };

export function clock(tz: string, now: Date, homeTz: string, h24 = false): Clock {
  const p = hm(tz).formatToParts(now);
  const h = Number(p.find((x) => x.type === "hour")!.value) % 24;
  const m = Number(p.find((x) => x.type === "minute")!.value);
  return {
    hour: h24 ? String(h).padStart(2, "0") : String(h % 12 || 12),
    minute: String(m).padStart(2, "0"),
    period: h < 12 ? "AM" : "PM",
    frac: (h * 60 + m) / 1440,
    dayShift: calendarDay(tz, now) - calendarDay(homeTz, now),
  };
}

export function hourLabel(timestamp: number, h24: boolean, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hourCycle: h24 ? "h23" : "h12" }).format(new Date(timestamp * 1000));
}

function offMin(tz: string, d: Date): number {
  const m = /GMT([+-])(\d\d):(\d\d)/.exec(part(tz, d, "longOffset"));
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}
const hm2 = (a: number) => `${Math.floor(a / 60)}${a % 60 ? ":" + String(a % 60).padStart(2, "0") : ""}`;

/** "UTC+5:30", "GMT−4" */
export function offsetText(tz: string, d: Date, utc: boolean): string {
  const m = offMin(tz, d), base = utc ? "UTC" : "GMT";
  return m ? `${base}${m < 0 ? "−" : "+"}${hm2(Math.abs(m))}` : base;
}
/** "8 h ahead", "5:30 h behind", "Same time" relative to your own zone */
export function diffText(tz: string, home: string, d: Date): string {
  const m = offMin(tz, d) - offMin(home, d);
  return m ? `${hm2(Math.abs(m))} h ${m > 0 ? "ahead" : "behind"}` : "Same time";
}
export function dateText(tz: string, d: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(d);
}
