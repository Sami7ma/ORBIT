import { useCallback, useEffect, useState } from "react";
import { cleanSettings, DEFAULTS, SETTINGS_KEY, type Settings } from "../domain/settings.ts";
import { preserveBackup } from "../platform/storage.ts";
export { DEFAULTS, type Settings } from "../domain/settings.ts";

export function useSettings(): [Settings, (patch: Partial<Settings>) => void, string | null] {
  const [state, setState] = useState(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(SETTINGS_KEY);
      return { settings: cleanSettings(JSON.parse(raw || "{}")), error: null as string | null, backup: null as string | null };
    } catch { return { settings: { ...DEFAULTS }, error: "Saved settings could not be read. Defaults are in use.", backup: raw }; }
  });
  useEffect(() => {
    try {
      if (state.backup !== null) preserveBackup(localStorage, `${SETTINGS_KEY}.backup`, state.backup);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    }
    catch { setState((previous) => previous.error ? previous : { ...previous, error: "Settings could not be saved. They will stay in this session." }); }
  }, [state.settings, state.backup]);
  const set = useCallback((patch: Partial<Settings>) => setState((previous) => ({ ...previous, settings: cleanSettings({ ...previous.settings, ...patch }) })), []);
  return [state.settings, set, state.error];
}
