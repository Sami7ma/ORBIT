# Verification

## Automated checks

Use Node 22.13 or later and install the locked dependencies with `npm ci`.

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run screenshots
```

The current baseline has 33 unit checks and 12 Chromium interaction checks. The screenshot capture runs separately. Type checking covers the application and tooling; the production frontend build also passes.

| Suite | Coverage |
| --- | --- |
| Unit | Storage migration and recovery, stable city identity, timezone and coordinate validation, DST, fractional offsets, date-line differences, weather validation and cancellation, serialized window layout |
| Browser | Clock resume, timezone changes, keyboard controls, city ordering and search, Local weather selection, units, stale/error weather, compact details, lock/pin preferences, viewport resizing and scrolling |
| CI | Frontend checks on Linux/Windows, Chromium interactions, locked native builds and RPM/NSIS packaging |

[The desktop build workflow](https://github.com/Sami7ma/ORBIT/actions/runs/45463263863) passed all five jobs for the implementation used in Fedora 0.1.0. CI retains unsigned development installers for seven days. Ubuntu packaging checks do not establish compatibility with every Fedora release, and browser checks do not verify OS window behavior.

## Fedora 0.1.0

Tested environment: **Fedora 44 KDE, x86_64**, Cargo/rustc 1.100.0, WebKitGTK 4.1 version 2.54.2 and GTK 3.24.52.

| Check | Result and scope |
| --- | --- |
| Native release build | Locked build passed without Rust compiler warnings |
| RPM integrity and contents | Digests pass; executable, desktop entry and icons present; application metadata populated |
| Libraries and desktop entry | No unresolved libraries reported by `ldd`; declared library providers installed; `desktop-file-validate` passes |
| Installation and basic use | Confirmed by the maintainer on 2026-11-25 |
| Compact details, weather, resize/scroll | Confirmed in the Fedora native test app |
| KDE pin integration | KWin acknowledged both keep-above states through the process-scoped native helper |
| Screenshots | Captured from the Fedora app on 2026-11-26 |
| Upgrade/removal, display scaling and tray recovery | Detailed checks remain pending |
| Other Fedora releases and desktops | Not verified |

The [Fedora release](https://github.com/Sami7ma/ORBIT/releases/tag/v0.1.0) provides the unsigned RPM and checksum. SHA-256 for `ORBIT-0.1.0-1.x86_64.rpm`:

```text
e79af79587a98d99d4bf54755b93605cbd65bfad794c7817d96eb3b64b4f04bc
```

After downloading both assets into the same directory, verify them with:

```sh
sha256sum --check ORBIT-0.1.0-1.x86_64.rpm.sha256
```

Native startup logged `gtk_window_set_titlebar() called on a realized window`; it did not terminate the application. RPMs are unsigned. The distribution license remains undecided.

## Platform checks still required

| Area | Checks |
| --- | --- |
| Windows | Installer install/upgrade/remove, tray reveal, focus-loss restoration, Win+D, Explorer restart, pin persistence, acrylic fallback, quit and sleep/resume |
| Fedora KDE | RPM upgrade/remove, tray and normal-window recovery, restart persistence, fonts and display scaling |
| Saved data | Upgrade from an existing profile, read-only storage, background quota failure and explicit Local weather choice |
| Displays | 100/125/150/200 percent scaling, mixed-DPI monitors, monitor removal and saved-position recovery |
| Accessibility | Keyboard navigation, Narrator/Orca, forced colors, reduced motion and larger display scaling |
| Packaged CSP | Local scripts, IPC and the two API hosts work; other remote scripts remain blocked |

The native Windows installer and desktop behavior are not yet manually verified. See [Windows release preparation](development.md#windows-release-preparation) for the next validation steps and [progress](progress.md) for the platform roadmap.

## Screenshot provenance

The `fedora-*.png` files are original captures from the Fedora application. Their matching `-rounded.svg` files crop to the app window and clip its curved corners, removing the surrounding desktop. A one-pixel inset excludes edge pixels blended with the wallpaper. The app contents remain unchanged. Recreate the display files with:

```sh
node scripts/prepare-fedora-screenshots.mjs
```

The `browser-*.png` files are automated interface references with transparent corners. They use a fixed instant of 2026-11-23 12:15 UTC, Africa/Addis_Ababa timezone, mocked weather, reduced motion and a 1000×950 browser viewport. They demonstrate interface states and are not native screenshots or evidence of current weather. Refresh them with `npm run screenshots`.
