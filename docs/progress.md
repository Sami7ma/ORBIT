# Implementation progress

This file records delivered code separately from platform verification. It follows Windows → Fedora application → native Plasma widget → Android → iOS.

## First milestone: shared reliability and build baseline

- [x] Install frontend dependencies and retain package-lock.json.
- [x] Validate city timezones and coordinates independently.
- [x] Preserve legacy cities through versioned migration and backup-before-replacement.
- [x] Introduce stable identities for geographic places and Local.
- [x] Refresh the clock after resume and runtime device-timezone changes.
- [x] Correct multi-day date differences and retain DST/fractional-offset behavior.
- [x] Normalize accented search, add UTC, refresh offset search metadata.
- [x] Separate Local time from an explicitly selected weather location.
- [x] Validate weather, retain missing values, show units and observation age.
- [x] Cancel obsolete requests and retain labeled stale forecasts on refresh failure.
- [x] Make rings keyboard/touch operable and name settings controls.
- [x] Add city reordering, scoped recovery, and surfaced persistence errors.
- [x] Serialize native layout calls and restrict Windows effects to Windows.
- [x] Separate Windows/Linux packaging and add a production CSP.
- [x] Add unit and browser regression suites and a CI workflow.
- [x] Pass 33 unit regressions, 12 Chromium interaction checks, and application/tooling type checks with a production frontend build.
- [x] Keep idle clocks compact, make center activation explicit and retain weather state badges.
- [x] Add persistent top-left lock and pin controls; verify KDE keep-above enable/disable through the native helper.
- [x] Resize the visible area from all edges/corners with one-clock bounds and independent clock scale.
- [x] Capture browser-preview design references with documented mock-data provenance.
- [x] Compile Windows and generate its NSIS installer in CI.
- [x] Build the Fedora 44 x86_64 RPM and validate its desktop entry and declared library providers.
- [ ] Verify Windows installer and native desktop behavior.
- [ ] Install the Fedora RPM and verify the interface in a real KDE Wayland session.
- [x] Retain the existing Cargo.lock from the GitHub repository.
- [x] Verify the retained Rust lockfile against the tray-enabled manifest with a locked Fedora native build.

## Windows completion

- [ ] Validate tray reveal and desktop restoration, including Win+D and Explorer restart.
- [ ] Define and implement explicit window modes where supported.
- [ ] Add optional autostart and single-instance handling.
- [ ] Add reset-to-visible-screen recovery and test monitor removal.
- [ ] Run native accessibility, DPI, installer and CSP checks.
- [ ] Capture actual Windows screenshots.

## Fedora completion

- [x] Install Rust and the WebKitGTK/GTK development prerequisites on Fedora 44.
- [x] Generate an RPM with populated application metadata and no Rust compiler warnings.
- [x] Confirm the native test window appears in the Fedora KDE session (user-reported smoke check).
- [x] Confirm compact activation, persistent weather and one-city resize/scroll behavior (user-reported check).
- [ ] Verify normal-window behavior, tray recovery and scaling on Wayland.
- [ ] Test RPM installation, upgrades and removal on supported Fedora versions.
- [ ] Capture actual Fedora screenshots.
- [ ] Evaluate Flatpak after native behavior is validated.

## Plasma 6 widget

- [ ] Prototype one configurable QML clock and the day-progress ring.
- [ ] Verify desktop/panel placement, resize and session restoration.
- [ ] Add multiple cities, accessible controls and optional weather.
- [ ] Decide and document whether settings are independent or shared with the app.
- [ ] Package, document and test the Plasmoid.

## Android and iOS

- [ ] Adapt the full app for mobile layout, lifecycle, safe areas and touch.
- [ ] Prototype an Android RemoteViews/TextClock widget with independent weather updates.
- [ ] Test multiple widget instances, launcher resizing, reboot and battery restrictions.
- [ ] Establish the macOS/Xcode build environment for iOS.
- [ ] Prove selected-timezone accuracy in a WidgetKit prototype before committing to its ring/update design.
- [ ] Integrate and test the native extensions, signing and distribution.

## Release decisions

- [ ] Choose the project's distribution license.
- [ ] Define the tested OS/version support matrix.
- [ ] Choose signing and update-delivery policies.
- [ ] Review provider attribution and commercial-use requirements for the intended distribution.
