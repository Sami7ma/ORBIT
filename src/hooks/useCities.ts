import { useEffect, useState } from "react";
import { loadCities, saveCities, type CityLoad } from "../features/cities/storage.ts";
import { defaultCities } from "../lib/cities.ts";

export function useCities(homeTz: string) {
  const [loaded] = useState<CityLoad>(() => {
    try { return loadCities(localStorage, homeTz); }
    catch { return { cities: defaultCities(homeTz), writable: false, notice: "Storage is unavailable. Changes will stay in this session." }; }
  });
  const [cities, setCities] = useState(loaded.cities);
  const [notice, setNotice] = useState<string | null>(loaded.notice);
  useEffect(() => {
    setCities((current) => current.some((city) => city.kind === "local" && city.tz !== homeTz)
      ? current.map((city) => city.kind === "local" ? { ...city, tz: homeTz } : city) : current);
  }, [homeTz]);
  useEffect(() => {
    if (!loaded.writable) return;
    try { saveCities(localStorage, cities, loaded.backup); }
    catch { setNotice("Your changes could not be saved. They will stay in this session."); }
  }, [cities, loaded]);
  return { cities, setCities, notice, setNotice };
}
