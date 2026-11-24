# Verification

Use Node 22.13 or later and install the locked dependencies with `npm ci`.

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run screenshots
```

The unit suite exercises damaged and newer storage schemas, migration backup failures, stable city identity, timezone and coordinate validation, scoped reset, accent-insensitive search, DST in both directions, fractional offsets, midnight, two-day date-line differences, weather validation, cancellation, stale detection and serialized window layouts.

The browser suite intercepts external services and uses a fixed clock. It exercises actual React interactions, storage migration, runtime timezone changes, clock resume, keyboard access, city reordering, offline search, Local weather selection, unit changes and stale/error presentations. It does not test native windows, a real provider's availability or OS compositor behavior.

## Screenshot provenance

`npm run screenshots` captures the current browser preview into `docs/screenshots/`. Samples use a fixed instant of 2026-11-23 12:15 UTC, device timezone Africa/Addis_Ababa, deterministic mocked weather, reduced motion and a 1000×950 browser viewport. These are development reference images, not native Windows or Fedora screenshots and not evidence of current real-world weather.

The source snapshot had icons but no original app screenshots. The reference images preserve the current ring design after the first reliability implementation; they are not a before/after comparison with an earlier release.

## Native checks required before a desktop release

| Area | Checks |
| --- | --- |
| Windows | Native build and installer, tray reveal/focus-loss restoration, Win+D, acrylic fallback, quit, sleep/resume, taskbar recovery |
| Fedora KDE | Native build, RPM install/remove, real Wayland rendering, tray, normal taskbar recovery, WebKitGTK fonts and scaling |
| Data | Upgrade from a real old profile, read-only storage, background quota failure, explicit Local weather choice |
| Displays | 100/125/150/200 percent scaling, two mixed-DPI monitors, monitor removal, saved position recovery |
| Accessibility | Keyboard navigation, Narrator/Orca, forced colors, reduced motion, opaque surface and larger display scaling |
| Security | Packaged CSP permits local scripts, IPC and the two API hosts while rejecting other remote scripts |

The workflow under `.github/workflows/check.yml` runs frontend checks on Linux and Windows, browser checks on Ubuntu, and native compilation on Linux and Windows. Adding the workflow is not evidence that those remote jobs have already run. The existing Cargo.lock from the GitHub repository is retained. A native build must verify that it remains compatible with the tray-enabled manifest before release.

## Fedora native build environment

On Fedora 44 KDE, the development prerequisites were installed on 2026-11-24.
The available toolchain is Cargo 1.100.0, rustc 1.100.0, WebKitGTK 4.1 version
2.54.2 and GTK 3.24.52. Installing these prerequisites enables native compilation;
it does not establish that compilation, RPM installation or desktop behavior passes.

```sh
cargo --version
rustc --version
pkg-config --modversion webkit2gtk-4.1 gtk+-3.0
npm run tauri -- build -- --locked
```
