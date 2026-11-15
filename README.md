# ORBIT

A glass world-clock widget. Rings show each city's time, weather scenes live inside, hover for the
next 8 hours. Tauri 2 (Rust) + React + TypeScript.

## Run it on Windows

Needs Node 20+, Rust, and the Microsoft C++ Build Tools ("Desktop development with C++").

```
npm install
npm run tauri dev       # live widget
npm run tauri build     # src-tauri\target\release\orbit.exe  (+ installer in bundle\nsis)
```

If you are updating from the first version: delete `src-tauri\target` is NOT needed, but run
`npm install` again (a new Rust plugin is downloaded on the first build).

## Using it

- Point at the widget: a small control pill appears top-right (+ add city, settings, pin, minimize, close).
- Drag any empty glass area to move it. Drag the bottom-right grip to resize.
- Mouse wheel over the rings slides through more than four.
- Hover a ring for the weather panel.

## Settings (gear)

- Look: Liquid glass or Solid black, transparency slider, desktop blur on/off, backgrounds
  (8 built-in scenes drawn in code, or "+ Yours" to use your own image).
- Size and behavior: size slider, minimal-until-hovered, pin (float on top / on desktop), lock position.
- Time: 12 or 24-hour, AM/PM on/off, GMT or UTC labels.
- Weather on/off.

Every city can be removed, including Local. Add it back from the + search ("My local time").
Search works on city, country, zone names ("Central") and offsets ("UTC+5:30"); with internet
it also finds any city in the world.

## Notes

- "On desktop" pin puts ORBIT behind your windows like a widget. Win+D (show desktop) can hide it.
- Acrylic blur needs Windows 10 1903+ or Windows 11.
- Not yet: autostart, tray icon, Android, Linux, iOS.
