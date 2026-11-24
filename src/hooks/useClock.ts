import { useEffect, useState } from "react";
import { localTz } from "../lib/cities.ts";
import { sameMinute } from "../lib/time.ts";

export function useClock() {
  const [clock, setClock] = useState(() => ({ now: new Date(), home: localTz() }));
  useEffect(() => {
    const tick = () => {
      const now = new Date(), home = localTz();
      setClock((previous) => sameMinute(previous.now, now) && previous.home === home ? previous : { now, home });
    };
    const visible = () => { if (!document.hidden) tick(); };
    const id = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    window.addEventListener("pageshow", tick);
    document.addEventListener("visibilitychange", visible);
    tick();
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", tick);
      window.removeEventListener("pageshow", tick);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  return clock;
}
