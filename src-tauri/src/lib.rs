use tauri::Manager;

#[tauri::command]
fn runtime_platform() -> &'static str {
    std::env::consts::OS
}

/// Turns the native Windows Acrylic blur (the desktop showing through) on or off.
#[tauri::command]
fn set_blur(app: tauri::AppHandle, enabled: bool) {
    #[cfg(target_os = "windows")]
    {
        if let Some(win) = app.get_webview_window("main") {
            if enabled {
                let _ = window_vibrancy::apply_acrylic(&win, Some((16, 18, 28, 20)));
            } else {
                let _ = window_vibrancy::clear_acrylic(&win);
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, enabled);
    }
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
        .invoke_handler(tauri::generate_handler![set_blur, runtime_platform])
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = window_vibrancy::apply_acrylic(&win, Some((16, 18, 28, 20)));
                }
            }
            let _ = app;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ORBIT");
}
