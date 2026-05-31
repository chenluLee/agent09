use serde::Deserialize;
use tauri::{
    Emitter, Manager,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    webview::WebviewWindowBuilder,
    WebviewUrl,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[derive(Deserialize)]
struct OpenObsidianUriInput {
    uri: String,
}

#[tauri::command]
fn open_obsidian_uri(input: OpenObsidianUriInput) -> Result<(), String> {
    if !input.uri.starts_with("obsidian://open?") {
        return Err("KA_URI_SCHEME_INVALID".to_string());
    }
    open::that(input.uri).map_err(|error| format!("KA_URI_OPEN_FAILED: {error}"))
}

fn show_settings_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    let url = WebviewUrl::App("index.html".into());
    let _ = WebviewWindowBuilder::new(app, "settings", url)
        .title("知识助手设置")
        .inner_size(640.0, 580.0)
        .min_inner_size(480.0, 420.0)
        .build();
}

fn show_debug_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("debug") {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    let url = WebviewUrl::App("debug.html".into());
    let _ = WebviewWindowBuilder::new(app, "debug", url)
        .title("知识助手 Demo 0 — 调试模式")
        .inner_size(1180.0, 760.0)
        .min_inner_size(860.0, 620.0)
        .build();
}

fn show_popup_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("popup") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = app.emit("shortcut-pressed", ());
        return;
    }
    let url = WebviewUrl::App("popup.html".into());
    let result = WebviewWindowBuilder::new(app, "popup", url)
        .title("知识助手")
        .inner_size(380.0, 420.0)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(true)
        .build();

    if let Ok(window) = result {
        let _ = window.set_position(tauri::Position::Physical(
            tauri::PhysicalPosition::new(920, 600)
        ));
        let app_handle = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(200));
            let _ = app_handle.emit("shortcut-pressed", ());
        });
    }
}

fn hide_popup_window(app: &tauri::AppHandle) {
    let _ = app.emit("shortcut-released", ());
}

fn main() {
    let shortcut = Shortcut::new(
        Some(Modifiers::CONTROL | Modifiers::SHIFT),
        Code::Space,
    );

    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, triggered_shortcut, event| {
                    if triggered_shortcut == &shortcut {
                        match event.state() {
                            ShortcutState::Pressed => show_popup_window(app),
                            ShortcutState::Released => hide_popup_window(app),
                        }
                    }
                })
                .build(),
        )
        .setup(move |app| {
            app.global_shortcut().register(shortcut)?;

            let settings_item = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let index_item = MenuItem::with_id(app, "index", "索引知识库", true, None::<&str>)?;
            let debug_item = MenuItem::with_id(app, "debug", "调试模式", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&settings_item, &index_item, &debug_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(true)
                .tooltip("知识助手")
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "settings" => show_settings_window(app),
                    "index" => {
                        show_settings_window(app);
                        let _ = app.emit("trigger-index", ());
                    }
                    "debug" => show_debug_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        show_popup_window(app);
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![open_obsidian_uri])
        .run(tauri::generate_context!())
        .expect("failed to run knowledge assistant demo 1");
}
