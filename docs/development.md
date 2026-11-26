# Development and packaging

Use Node 22.13 or later. Install dependencies with `npm ci`; use `npm run dev` for a browser preview and open the URL printed by Vite. `npm test` runs unit tests and `npm run build` checks types and builds the frontend.

## Browser checks

```sh
npx playwright install chromium
npm run test:e2e
npm run screenshots
```

See [verification](testing.md) for coverage, manual checks and screenshot provenance.

## Fedora

Install Rust and the Fedora build dependencies described by [Tauri](https://v2.tauri.app/start/prerequisites/):

```sh
sudo dnf install rust cargo webkit2gtk4.1-devel openssl-devel curl wget file \
  libappindicator-gtk3-devel librsvg2-devel libxdo-devel gcc gcc-c++ make patchelf
```

Run `npm run tauri -- dev` for development, or build an RPM using the retained Rust lockfile:

```sh
npm run tauri -- build -- --locked
sudo dnf install ./src-tauri/target/release/bundle/rpm/ORBIT-0.1.0-1.x86_64.rpm
```

Linux uses a taskbar-visible window. Desktop blur is available only on Windows. The native Plasma widget is a separate planned project.

## Windows

Install Rust, Microsoft C++ Build Tools with the Desktop development with C++ workload, and the WebView2 prerequisites described by [Tauri](https://v2.tauri.app/start/prerequisites/).

```sh
npm run tauri -- dev
npm run tauri -- build -- --locked
```

The NSIS installer is generated under `src-tauri/target/release/bundle/nsis/`. The tray menu provides **Show ORBIT** and **Quit ORBIT**; native desktop interaction and installation remain to be tested.

## Data and offline behavior

The clock and bundled city search work offline. Weather is optional and cached in memory; a new offline launch has no saved forecast. If a refresh fails during a session, ORBIT labels the last successful forecast as saved and suppresses stale animated scenes. Local time follows the device timezone; Local weather requires an explicit location.

City lists migrate to version 3 with backups before replacement. Unknown future schemas are preserved. The recovery screen resets only ORBIT's storage keys. Custom images are resized locally and are not uploaded. See [architecture](architecture.md).

Weather and worldwide city search are provided by [Open-Meteo](https://open-meteo.com/). Data is attributed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); review the provider's [terms](https://open-meteo.com/en/terms) for the intended distribution model.
