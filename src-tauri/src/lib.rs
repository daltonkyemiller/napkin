use base64::{engine::general_purpose::STANDARD, Engine};
use clap::Parser;
use font_kit::source::SystemSource;
use image::ImageFormat;
use rusty_tesseract::{Args as TesseractArgs, Image as TesseractImage};
use std::collections::BTreeSet;
use std::io::{Cursor, Read};
use std::sync::Mutex;
use tauri::{Manager, State};

#[derive(Parser, Debug, Clone)]
#[command(name = "annotate")]
#[command(about = "A screenshot annotation tool")]
pub struct Args {
    #[arg(short, long)]
    pub filename: Option<String>,

    #[arg(short, long)]
    pub output_filename: Option<String>,

    #[arg(long)]
    pub fullscreen: bool,
}

#[derive(Default)]
pub struct AppState {
    pub initial_image: Mutex<Option<String>>,
    pub output_filename: Mutex<Option<String>>,
    pub fullscreen: Mutex<bool>,
}

fn convert_to_png_data_url(buffer: &[u8]) -> Result<String, String> {
    let img = image::load_from_memory(buffer)
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    let mut png_buffer = Cursor::new(Vec::new());
    img.write_to(&mut png_buffer, ImageFormat::Png)
        .map_err(|e| format!("Failed to encode as PNG: {}", e))?;

    let base64_data = STANDARD.encode(png_buffer.get_ref());
    Ok(format!("data:image/png;base64,{}", base64_data))
}

fn load_image_from_stdin() -> Result<String, String> {
    let mut buffer = Vec::new();
    std::io::stdin()
        .read_to_end(&mut buffer)
        .map_err(|e| format!("Failed to read from stdin: {}", e))?;

    if buffer.is_empty() {
        return Err("No data received from stdin".to_string());
    }

    convert_to_png_data_url(&buffer)
}

fn load_image_from_file(path: &str) -> Result<String, String> {
    let buffer = std::fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;
    convert_to_png_data_url(&buffer)
}

#[tauri::command]
fn get_initial_image(state: State<AppState>) -> Option<String> {
    state.initial_image.lock().unwrap().clone()
}

#[tauri::command]
fn get_output_filename(state: State<AppState>) -> Option<String> {
    state.output_filename.lock().unwrap().clone()
}

#[tauri::command]
fn get_fullscreen(state: State<AppState>) -> bool {
    *state.fullscreen.lock().unwrap()
}

#[tauri::command]
fn perform_ocr(image_data: String) -> Result<String, String> {
    let base64_data = image_data
        .strip_prefix("data:image/png;base64,")
        .or_else(|| image_data.strip_prefix("data:image/jpeg;base64,"))
        .unwrap_or(&image_data);

    let image_bytes = STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    let dynamic_img = image::load_from_memory(&image_bytes)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let tesseract_image = TesseractImage::from_dynamic_image(&dynamic_img)
        .map_err(|e| format!("Failed to create tesseract image: {}", e))?;

    let args = TesseractArgs {
        lang: "eng".to_string(),
        ..Default::default()
    };

    let text = rusty_tesseract::image_to_string(&tesseract_image, &args)
        .map_err(|e| format!("OCR failed: {}", e))?;

    Ok(text.trim().to_string())
}

#[tauri::command]
fn get_system_fonts() -> Vec<String> {
    let source = SystemSource::new();
    let mut families: BTreeSet<String> = BTreeSet::new();

    if let Ok(all_families) = source.all_families() {
        for family in all_families {
            if !family.starts_with('.') && !family.starts_with('#') {
                families.insert(family);
            }
        }
    }

    families.into_iter().collect()
}

#[tauri::command]
fn save_theme_css(css: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    let theme_path = app_data_dir.join("theme.css");
    std::fs::write(&theme_path, css)
        .map_err(|e| format!("Failed to write theme file: {}", e))?;

    Ok(())
}

#[tauri::command]
fn load_theme_css(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let theme_path = app_data_dir.join("theme.css");

    if theme_path.exists() {
        let css = std::fs::read_to_string(&theme_path)
            .map_err(|e| format!("Failed to read theme file: {}", e))?;
        Ok(Some(css))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn save_theme_preference(preference: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    let pref_path = app_data_dir.join("theme-preference.txt");
    std::fs::write(&pref_path, preference)
        .map_err(|e| format!("Failed to write preference file: {}", e))?;

    Ok(())
}

#[tauri::command]
fn load_theme_preference(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let pref_path = app_data_dir.join("theme-preference.txt");

    if pref_path.exists() {
        let pref = std::fs::read_to_string(&pref_path)
            .map_err(|e| format!("Failed to read preference file: {}", e))?;
        Ok(Some(pref.trim().to_string()))
    } else {
        Ok(None)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args = Args::parse();

    let initial_image = match &args.filename {
        Some(filename) if filename == "-" => match load_image_from_stdin() {
            Ok(data) => Some(data),
            Err(e) => {
                eprintln!("Error loading from stdin: {}", e);
                None
            }
        },
        Some(filename) => match load_image_from_file(filename) {
            Ok(data) => Some(data),
            Err(e) => {
                eprintln!("Error loading file: {}", e);
                None
            }
        },
        None => None,
    };

    let app_state = AppState {
        initial_image: Mutex::new(initial_image),
        output_filename: Mutex::new(args.output_filename),
        fullscreen: Mutex::new(args.fullscreen),
    };

    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_initial_image,
            get_output_filename,
            get_fullscreen,
            perform_ocr,
            get_system_fonts,
            save_theme_css,
            load_theme_css,
            save_theme_preference,
            load_theme_preference
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
