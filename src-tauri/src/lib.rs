use base64::{engine::general_purpose::STANDARD, Engine};
use clap::Parser;
use image::ImageFormat;
use rusty_tesseract::{Args as TesseractArgs, Image as TesseractImage};
use std::io::{Cursor, Read};
use std::sync::Mutex;
use tauri::State;

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
            perform_ocr
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
