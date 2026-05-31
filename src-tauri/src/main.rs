use serde::Deserialize;

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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_obsidian_uri])
        .run(tauri::generate_context!())
        .expect("failed to run knowledge assistant demo 0");
}
