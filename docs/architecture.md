# Architecture

ORBIT keeps its original React ring interface inside a Tauri desktop shell. Pure domain rules are separated from React lifecycle and native window operations so they can be tested without a webview.

| Location | Responsibility |
| --- | --- |
| `src/domain/city.ts` | Validated city model, stable location identity, explicit Local weather selection |
| `src/domain/settings.ts` | Defaults and runtime validation of settings |
| `src/lib/time.ts` | IANA time formatting, date differences, offsets and minute comparisons |
| `src/lib/cities.ts` | Bundled offline city catalogue |
| `src/lib/search.ts` | Offline timezone search and validated online geocoding |
| `src/features/cities/storage.ts` | Versioned persistence, migration, backups and scoped recovery |
| `src/features/weather/` | Provider validation, cancellation, request scheduling, cache and stale state |
| `src/hooks/` | Clock lifecycle and city persistence integration |
| `src/platform/layout.ts` | Serialization and coalescing of native layout operations |
| `src/platform/viewport.ts` | Visible city area, row layout and one-clock resize bounds |
| `src/platform/storage.ts` | Backup preservation and recovery scoped to ORBIT |
| `src/lib/win.ts` | Browser/native boundary and OS-specific window calls |
| `src/components/` | Rings, details, city management and settings |
| `src-tauri/` | Native window, desktop tray, position persistence and packaging |
| `src-tauri/src/kwin.rs` | Process-scoped pin integration for KDE Wayland |

## Time and Local

All selected clocks use IANA timezone identifiers. `Intl` supplies the platform timezone rules; offsets are evaluated at the displayed instant. A calendar-day difference is computed from explicit date components, including differences larger than one day.

The clock samples once per second but updates React state only when the epoch minute or system timezone changes. Focus, page restoration and visibility changes trigger an immediate sample.

Local has the fixed identity `local`. Its timezone follows the device. Its weather coordinates remain unset until the user chooses a location. That choice is fixed until changed explicitly; changing the device timezone does not silently move weather to an inferred city.

## Persistence

Cities use `orbit.cities.v3`, containing `{ version: 3, cities: [...] }`. Version 2 arrays are migrated one entry at a time. Invalid timezone entries are omitted, duplicates are removed, and valid entries are preserved. Coordinate pairs must be complete, finite and in bounds; missing coordinates produce a time-only entry.

Legacy Local coordinates were inferred from timezone rather than selected by the user. Migration drops those coordinates and explains that a location can be selected again.

Before a migration or damaged-list replacement is written, the original raw value is retained in the corresponding `.backup` key, with numbered suffixes when an earlier different backup exists. The original version 2 key is also retained. If the backup cannot be written, replacement does not proceed. An unrecognized schema version is left untouched and the session uses temporary defaults.

Settings retain `orbit.settings.v2` for compatibility, adding validated temperature units and independent viewport width/height preferences. Existing profiles acquire a 520×188 logical-pixel viewport while retaining their clock scale. Malformed settings JSON is backed up before defaults replace it. Custom backgrounds use `orbit.bg.custom`. The crash recovery action clears only keys beginning with `orbit.`.

## Weather and privacy

Weather requests go directly from the webview to Open-Meteo. Latitude, longitude, timezone and requested temperature unit are sent. City search sends the typed query to the geocoding endpoint after a short debounce. ORBIT does not request device geolocation or upload custom backgrounds.

The provider is asked for epoch timestamps. Forecast hours are formatted in the clock's timezone, avoiding ambiguous string comparisons during repeated DST hours. Missing values stay unavailable. A location with no coordinates sends no weather request.

Requests have a timeout and are aborted when their effect is replaced. Cached forecasts are scoped to location, timezone and units, refreshed every fifteen minutes, and marked stale after thirty minutes or on refresh failure. Resume and network-restoration events retry eligible requests. The cache is in memory, so a fresh offline launch has clocks but no saved forecast.

The panel shows observation age. Stale weather scenes are suppressed; retained badges remain visible with a saved-data marker. Loading, unavailable and missing-location badges keep weather state visible without opening details. Turning weather off hides all weather presentation. Forecast hours that have passed are filtered from the panel.

## Platform boundary

The native `runtime_platform` command supplies the OS. Windows receives acrylic and desktop stacking calls. Linux starts as a normal taskbar-visible application and does not receive Windows-only stacking requests. Native layout changes are serialized so an older request cannot finish after a newer size has already been applied.

Clock details open only when the center button is activated, including Enter/Space. Hover, focus and scrolling do not open them. Pointer leave, window blur, Escape and the panel close button collapse details.

The default visible area is one horizontal row. Dragging an edge or corner adjusts its width/height independently of clock scale; it cannot crop below a complete clock. Extra height creates more rows, and excess columns remain horizontally scrollable. Native pointer resizing uses the compositor's resize gesture so top/left anchors work on Wayland; the browser preview uses pointer deltas. Native resize observations are debounced, distinguish requested layouts from manual sizes, and do not send an older size back during a compositor drag. The profile stores dimensions in logical pixels, separate from monitor DPI and user zoom. Lock position disables the handles and fixes native size constraints.

Windows tray reveal temporarily raises the widget and restores bottom stacking when it loses focus. This path requires native Windows verification. Native initialization and CSP also require packaged-app testing; browser checks cannot establish those behaviors.

Plasma, Android home-screen widgets and WidgetKit are future native surfaces. They are not implemented by the browser preview or the mobile entry-point annotation.

## Quick lock and pin

The top-left lock shares the existing `lock` preference with Settings. It hides
resize handles and fixes native size bounds while keeping the clock and city
controls usable. `pinned` defaults to false for older profiles and is persisted
independently. The native `set_pinned` command owns stacking changes, so Windows
tray reveal and focus-loss recovery do not clear an active pin.

On KDE Wayland, the pin uses the [KWin keepAbove property](https://develop.kde.org/docs/plasma/kwin/api/).
A temporary script matches only ORBIT's process ID and window title, acknowledges
the actual property value over a private session-bus connection, and is unloaded
afterward. It does not install a KWin script or write window rules. Other desktop
backends use Tauri's native window API; other Wayland compositors remain unverified.
The Linux dependency uses the DBus version already present in Cargo.lock; only
the root dependency edge was added.
