mod config;
mod icons;

use base64::{engine::general_purpose::STANDARD, Engine};
use clap::Parser;
use font_kit::source::SystemSource;
use image::ImageFormat;
use rusty_tesseract::{Args as TesseractArgs, Image as TesseractImage};
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
use std::io::{Cursor, Read};
use std::sync::Mutex;
use tauri::{Manager, State};

#[derive(Parser, Debug, Clone)]
#[command(name = "napkin")]
#[command(about = "A lightweight image annotation app")]
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
    let img =
        image::load_from_memory(buffer).map_err(|e| format!("Failed to decode image: {}", e))?;

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
fn save_theme_css(css: String) -> Result<(), String> {
    let css_opt = if css.trim().is_empty() {
        None
    } else {
        Some(css)
    };
    config::save_theme_custom_css(css_opt)
}

#[tauri::command]
fn load_theme_css() -> Result<Option<String>, String> {
    let theme = config::load_theme()?;
    Ok(theme.and_then(|t| t.custom_css))
}

#[tauri::command]
fn save_theme_preference(preference: String) -> Result<(), String> {
    config::save_theme_mode(&preference)
}

#[tauri::command]
fn load_theme_preference() -> Result<Option<String>, String> {
    let theme = config::load_theme()?;
    Ok(theme.and_then(|t| t.mode))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    stroke_width: Option<u32>,
    font_size: Option<u32>,
    sketchiness: Option<f64>,
    default_save_location: Option<String>,
    auto_save_to_default: Option<bool>,
    close_after_save: Option<bool>,
    palette: Option<Vec<String>>,
    default_save_format: Option<String>,
}

impl From<config::AppConfig> for AppSettings {
    fn from(cfg: config::AppConfig) -> Self {
        AppSettings {
            stroke_width: cfg.stroke_width,
            font_size: cfg.font_size,
            sketchiness: cfg.sketchiness,
            default_save_location: cfg.default_save_location,
            auto_save_to_default: cfg.auto_save_to_default,
            close_after_save: cfg.close_after_save,
            palette: cfg.palette,
            default_save_format: cfg.default_save_format,
        }
    }
}

impl From<AppSettings> for config::AppConfig {
    fn from(settings: AppSettings) -> Self {
        config::AppConfig {
            stroke_width: settings.stroke_width,
            font_size: settings.font_size,
            sketchiness: settings.sketchiness,
            default_save_location: settings.default_save_location,
            auto_save_to_default: settings.auto_save_to_default,
            close_after_save: settings.close_after_save,
            palette: settings.palette,
            default_save_format: settings.default_save_format,
        }
    }
}

#[tauri::command]
fn save_settings(settings: AppSettings) -> Result<(), String> {
    config::save_config(&settings.into())
}

#[tauri::command]
fn load_settings() -> Result<Option<AppSettings>, String> {
    let cfg = config::load_config()?;
    Ok(cfg.map(|c| c.into()))
}

#[tauri::command]
fn get_config_dir() -> Result<String, String> {
    config::get_config_dir().map(|p| p.to_string_lossy().to_string())
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
        .plugin(tauri_plugin_notification::init())
        .manage(app_state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if let Ok(app_data_dir) = app.path().app_data_dir() {
                let _ = config::migrate_from_app_data(&app_data_dir);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_initial_image,
            get_output_filename,
            get_fullscreen,
            perform_ocr,
            get_system_fonts,
            save_theme_css,
            load_theme_css,
            save_theme_preference,
            load_theme_preference,
            save_settings,
            load_settings,
            get_config_dir,
            icons::load_icon_mapping,
            icons::save_icon_mapping,
            icons::load_svg_file,
            icons::scan_icon_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
