use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_single_instance::init(|app, _args, _cwd| {
                // When a second instance is launched, focus the existing window
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }),
        )
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .setup(|app| {
            // Register deep-link handler: huddle://plan/xxx
            #[cfg(desktop)]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Huddle desktop app");
}
