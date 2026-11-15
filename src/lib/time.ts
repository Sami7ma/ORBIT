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

const meta = new Map<string, string>();
/** Everything someone might type to find a zone: names, abbreviations, "gmt+3", "utc+5:30". */
export function searchText(tz: string, city: string, country: string): string {
  if (!meta.has(tz)) {
    const now = new Date();
    const m = /GMT([+-])(\d\d):(\d\d)/.exec(part(tz, now, "longOffset"));
    let off = "gmt+0 utc+0 utc gmt";
    if (m) {
      const h = Number(m[2]), mm = m[3];
      const a = `${m[1]}${h}${mm !== "00" ? ":" + mm : ""}`;
      off = `gmt${a} utc${a} gmt${m[1]}${m[2]}:${mm} utc${m[1]}${m[2]}:${mm}`;
    }
    meta.set(tz, `${tz.replace(/[_/]/g, " ")} ${REGION[tz] ?? ""} ${part(tz, now, "short")} ${off}`.toLowerCase());
  }
  return `${city} ${country} ${meta.get(tz)}`.toLowerCase();
}

const hm = (tz: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", hour: "numeric", minute: "numeric" });
const ymd = (tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz });

export type Clock = { hour: string; minute: string; period: "AM" | "PM"; frac: number; dayShift: -1 | 0 | 1 };

export function clock(tz: string, now: Date, homeTz: string, h24 = false): Clock {
  const p = hm(tz).formatToParts(now);
  const h = Number(p.find((x) => x.type === "hour")!.value) % 24;
  const m = Number(p.find((x) => x.type === "minute")!.value);
  const a = ymd(tz).format(now);
  const b = ymd(homeTz).format(now);
  return {
    hour: h24 ? String(h).padStart(2, "0") : String(h % 12 || 12),
    minute: String(m).padStart(2, "0"),
    period: h < 12 ? "AM" : "PM",
    frac: (h * 60 + m) / 1440,
    dayShift: a === b ? 0 : a > b ? 1 : -1,
  };
}

export function hourLabel(isoLocal: string, h24: boolean): string {
  const h = Number(isoLocal.slice(11, 13));
  return h24 ? `${String(h).padStart(2, "0")}:00` : `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
}
