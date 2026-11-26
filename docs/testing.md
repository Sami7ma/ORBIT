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

The browser suite intercepts external services and uses a fixed clock. It exercises actual React interactions, storage migration, runtime timezone changes, clock resume, keyboard access, city reordering, offline search, Local weather selection, unit changes and stale/error presentations. It also checks center-only activation, collapse on leave, weather visibility while compact, viewport resizing to one city, scrolling to clipped clocks, size persistence, additional rows and the resize lock. It does not test native windows, a real provider's availability or OS compositor behavior.

## Screenshot provenance

The `fedora-*.png` screenshots were supplied by the user from the Fedora app on
2026-11-26. Their matching `-rounded.svg` files display the original PNGs with
rounded clipping for the README; the source screenshots remain unchanged.

`npm run screenshots` captures the current browser preview into `docs/screenshots/`. Samples use a fixed instant of 2026-11-23 12:15 UTC, device timezone Africa/Addis_Ababa, deterministic mocked weather, reduced motion and a 1000×950 browser viewport. These are development reference images, not native Windows or Fedora screenshots and not evidence of current real-world weather.

The source snapshot had icons but no original app screenshots. The reference images preserve the current ring design after the first reliability implementation; they are not a before/after comparison with an earlier release.

## Native checks required before a desktop release

| Area | Checks |
| --- | --- |
| Windows | Installer install/upgrade/remove, tray reveal/focus-loss restoration, Win+D, acrylic fallback, quit, sleep/resume, taskbar recovery |
| Fedora KDE | RPM install/upgrade/remove, real Wayland rendering, tray, normal taskbar recovery, WebKitGTK fonts and scaling |
| Data | Upgrade from a real old profile, read-only storage, background quota failure, explicit Local weather choice |
| Displays | 100/125/150/200 percent scaling, two mixed-DPI monitors, monitor removal, saved position recovery |
| Accessibility | Keyboard navigation, Narrator/Orca, forced colors, reduced motion, opaque surface and larger display scaling |
| Security | Packaged CSP permits local scripts, IPC and the two API hosts while rejecting other remote scripts |

The workflow under `.github/workflows/check.yml` runs frontend checks on Linux and Windows, browser checks on Ubuntu, and locked native builds on Linux and Windows. It packages RPM/NSIS installers and retains unsigned development bundles as `desktop-bundles-Linux` and `desktop-bundles-Windows` artifacts for seven days. These artifacts support manual verification; they are not signed releases. The Ubuntu build does not replace testing the RPM on Fedora.

[The first reliability workflow run](https://github.com/Sami7ma/ORBIT/actions/runs/45395935330) passed all five jobs, including native Windows and Ubuntu compilation. That run used `--no-bundle`; it proves compilation, not installer generation or desktop behavior. Installer results must be checked in a later run after the bundling workflow change. The existing Cargo.lock is retained, and the current workflow rejects changes to it.

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

## Native verification record

Checked on 2026-11-24. Fedora results apply to Fedora 44 KDE on x86_64;
other Fedora versions have not been established as supported.

| Check | Result and scope |
| --- | --- |
| Windows and Ubuntu frontend, unit and browser checks | Passed in [the first reliability run](https://github.com/Sami7ma/ORBIT/actions/runs/45395935330) |
| Locked Windows and Ubuntu native builds; NSIS/RPM generation | Passed in [the installer workflow](https://github.com/Sami7ma/ORBIT/actions/runs/45423280063) |
| Fedora release build and RPM | `npm run tauri -- build -- --locked` passed with Cargo/rustc 1.100.0, WebKitGTK 2.54.2 and GTK 3.24.52; no Rust compiler warnings after platform scoping |
| Rust lockfile | Existing dependency versions retained; added the root Linux DBus dependency edge for KDE pin support. The locked build does not change the committed file |
| RPM contents | Contains the executable, desktop entry and 32/128/512-pixel icons; summary, description and Utility category populated |
| RPM dependencies | All three declared library providers are installed; `ldd` reports no unresolved libraries on this machine |
| Desktop entry | `desktop-file-validate` passes |
| RPM executable | Matches the release executable except for Tauri's documented-in-source RPM bundle-type marker |
| Native startup | User confirmed the native window appears in Fedora KDE using the isolated test profile |
| System installation | On 2026-11-25 the user reported that the Fedora RPM installation and app work. Individual scaling, tray and restart checks were not separately reported |
| System upgrades and removal | Pending on Fedora |
| Windows desktop interaction | Pending on a real Windows desktop |

The local development package is
`src-tauri/target/release/bundle/rpm/ORBIT-0.1.0-1.x86_64.rpm`, with SHA-256
`e79af79587a98d99d4bf54755b93605cbd65bfad794c7817d96eb3b64b4f04bc`.
Build artifacts are ignored by Git. Packages are unsigned, and the distribution
license remains a release decision.

Native startup logged one GTK warning,
`gtk_window_set_titlebar() called on a realized window`. It did not terminate
the process; this observation does not establish correct rendering or tray behavior.

## Compact interaction and viewport update

The updated interface passes 33 unit checks and 12 Chromium interaction checks,
plus type checking and a production frontend build. Reference images now include
one-city and two-row viewports. The native pointer resize path delegates to the
OS compositor; browser pointer tests do not establish Wayland edge anchoring,
monitor DPI behavior or Windows desktop stacking. Those remain manual checks for
the updated native package. The earlier user-confirmed startup check applies to
the build before this interaction update.

The updated Fedora RPM was rebuilt successfully with `--locked` and no Rust
compiler warnings. Its desktop entry and expected RPM bundle marker validate.

## Quick-control verification

The user confirmed the compact, weather and viewport behavior in the native
Fedora test instance before the quick controls were added. The browser suite
also verifies the lock and pin buttons without opening Settings, disabled resize
handles while locked, and both preferences after reload.

The exact KDE pin helper used by the application was run against the ORBIT test
window. KWin acknowledged `keepAbove=true`, then `keepAbove=false`, and the helper
restored the original unpinned state. This verifies the native KDE setter and its
acknowledgement path, rather than only the appearance of a pressed button. The
updated application and RPM also build with the retained locked dependency
versions. Windows focus-loss/tray behavior while pinned and native button
interaction across a restart remain manual platform checks. Subsequently, the
user reported that the installed Fedora app works; results for each individual
check were not separately reported.
