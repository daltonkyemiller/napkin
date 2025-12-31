//! Icon mapping configuration.
//!
//! Allows users to customize icons by mapping semantic icon names to SVG files.
//! Mappings are stored in `icons.yml` in the config directory.

use crate::config::get_config_dir;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

pub type IconMapping = HashMap<String, Option<String>>;

/// Returns the path to icons.yml in the config directory.
fn get_icons_config_path() -> Result<PathBuf, String> {
    let config_dir = get_config_dir()?;
    Ok(config_dir.join("icons.yml"))
}

/// Ensures the config directory exists.
fn ensure_config_dir() -> Result<PathBuf, String> {
    let config_dir = get_config_dir()?;
    fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;
    Ok(config_dir)
}

/// Loads icon mapping from icons.yml.
#[tauri::command]
pub fn load_icon_mapping() -> Result<Option<IconMapping>, String> {
    let icons_path = get_icons_config_path()?;

    if !icons_path.exists() {
        return Ok(None);
    }

    let content =
        fs::read_to_string(&icons_path).map_err(|e| format!("Failed to read icons.yml: {}", e))?;

    let mapping: IconMapping =
        serde_yaml::from_str(&content).map_err(|e| format!("Failed to parse icons.yml: {}", e))?;

    Ok(Some(mapping))
}

/// Saves icon mapping to icons.yml.
#[tauri::command]
pub fn save_icon_mapping(mapping: IconMapping) -> Result<(), String> {
    let config_dir = ensure_config_dir()?;
    let icons_path = config_dir.join("icons.yml");

    let yaml = serde_yaml::to_string(&mapping)
        .map_err(|e| format!("Failed to serialize icon mapping: {}", e))?;

    let header = "# Napkin Icon Configuration\n\
                  # \n\
                  # Map semantic icon names to custom SVG file paths.\n\
                  # Use null or remove the line to reset to the default (Lucide) icon.\n\
                  # \n\
                  # Example:\n\
                  # arrow-right: /path/to/custom-arrow.svg\n\
                  # trash: ~/icons/delete.svg\n\
                  # check: null  # uses default\n\n";

    fs::write(&icons_path, format!("{header}{yaml}"))
        .map_err(|e| format!("Failed to write icons.yml: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn load_svg_file(file_path: String) -> Result<String, String> {
    let expanded_path = expand_home_path(&file_path);

    let content = fs::read_to_string(&expanded_path)
        .map_err(|e| format!("Failed to read SVG file '{}': {}", file_path, e))?;

    if !content.contains("<svg") {
        return Err(format!(
            "File '{}' does not appear to be a valid SVG",
            file_path
        ));
    }

    Ok(content)
}

fn expand_home_path(path: &str) -> PathBuf {
    if path.starts_with("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(&path[2..]);
        }
    }
    PathBuf::from(path)
}

fn scan_dir_recursive(dir: &PathBuf, svg_files: &mut Vec<String>) -> Result<(), String> {
    let entries = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory '{}': {}", dir.display(), e))?;

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_dir() {
            scan_dir_recursive(&path, svg_files)?;
        } else if path.is_file() && path.extension().map_or(false, |ext| ext == "svg") {
            svg_files.push(path.to_string_lossy().to_string());
        }
    }
    Ok(())
}

#[tauri::command]
pub fn scan_icon_directory(dir_path: String) -> Result<Vec<String>, String> {
    let expanded_path = expand_home_path(&dir_path);

    if !expanded_path.is_dir() {
        return Err(format!("'{}' is not a directory", dir_path));
    }

    let mut svg_files: Vec<String> = Vec::new();
    scan_dir_recursive(&expanded_path, &mut svg_files)?;
    svg_files.sort();
    Ok(svg_files)
}
