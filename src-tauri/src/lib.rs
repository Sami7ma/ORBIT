use tauri::Manager;
use std::sync::atomic::{AtomicBool, Ordering};

#[derive(Default)]
struct RevealState(AtomicBool);

#[tauri::command]
fn runtime_platform() -> &'static str {
    std::env::consts::OS
}

/// Turns the native Windows Acrylic blur (the desktop showing through) on or off.
#[tauri::command]
fn set_blur(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let win = app.get_webview_window("main").ok_or("Main window is unavailable")?;
        if enabled {
            window_vibrancy::apply_acrylic(&win, Some((16, 18, 28, 20))).map_err(|error| error.to_string())?;
        } else {
            window_vibrancy::clear_acrylic(&win).map_err(|error| error.to_string())?;
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, enabled);
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Remembers where you left the widget on screen.
    #[cfg(desktop)]
    {
        builder = builder.plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(tauri_plugin_window_state::StateFlags::POSITION)
                .build(),
        );
    }

    builder
        .manage(RevealState::default())
        .invoke_handler(tauri::generate_handler![set_blur, runtime_platform])
        .on_window_event(|window, event| {
            // Showing the desktop widget temporarily raises it; return it behind other
            // windows after the user leaves, rather than permanently changing its mode.
            #[cfg(target_os = "windows")]
            if matches!(event, tauri::WindowEvent::Focused(false))
                && window.state::<RevealState>().0.swap(false, Ordering::Relaxed)
            {
                if let Err(error) = window.set_always_on_bottom(true) {
                    eprintln!("ORBIT could not restore desktop placement: {error}");
                }
            }
            let _ = (window, event);
        })
        .setup(|app| {
            // The widget has no taskbar button, so the tray icon is how you find it again.
            #[cfg(desktop)]
            {
                use tauri::menu::{Menu, MenuItem};
                use tauri::tray::TrayIconBuilder;

                let show = MenuItem::with_id(app, "show", "Show ORBIT", true, None::<&str>)?;
                let quit = MenuItem::with_id(app, "quit", "Quit ORBIT", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show, &quit])?;
                let mut tray = TrayIconBuilder::new()
                    .menu(&menu)
                    .tooltip("ORBIT")
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "show" => {
                            if let Some(w) = app.get_webview_window("main") {
                                #[cfg(target_os = "windows")]
                                {
                                    let _ = w.set_always_on_bottom(false);
                                    let _ = w.set_always_on_top(true);
                                    let _ = w.set_always_on_top(false);
                                }
                                if let Err(error) = w.unminimize().and_then(|_| w.show()).and_then(|_| w.set_focus()) {
                                    eprintln!("ORBIT could not reveal its window: {error}");
                                }
                                #[cfg(target_os = "windows")]
                                app.state::<RevealState>().0.store(true, Ordering::Relaxed);
                            }
                        }
                        "quit" => app.exit(0),
                        _ => {}
                    });
                if let Some(icon) = app.default_window_icon() {
                    tray = tray.icon(icon.clone());
                }
                if let Err(error) = tray.build(app) {
                    eprintln!("ORBIT could not create its tray icon: {error}");
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.set_skip_taskbar(false);
                    }
                }
            }

            let _ = app;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ORBIT");
}
