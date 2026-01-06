//! Configuration management with XDG Base Directory support.
//!
//! Config files are stored in:
//! - `$XDG_CONFIG_HOME/napkin/` (if XDG_CONFIG_HOME is set)
//! - `$HOME/.config/napkin/` (fallback)
//!
//! Files:
//! - `config.yml` - Application settings
//! - `theme.yml` - Theme preferences and custom CSS

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Returns the napkin config directory, respecting XDG Base Directory spec.
///
/// Priority:
/// 1. `$XDG_CONFIG_HOME/napkin`
/// 2. `$HOME/.config/napkin`
pub fn get_config_dir() -> Result<PathBuf, String> {
    let config_dir = if let Ok(xdg_config) = std::env::var("XDG_CONFIG_HOME") {
        PathBuf::from(xdg_config).join("napkin")
    } else if let Some(home) = dirs::home_dir() {
        home.join(".config").join("napkin")
    } else {
        return Err("Could not determine config directory".to_string());
    };

    Ok(config_dir)
}

/// Ensures the config directory exists.
fn ensure_config_dir() -> Result<PathBuf, String> {
    let config_dir = get_config_dir()?;
    fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;
    Ok(config_dir)
}

/// Application settings stored in config.yml
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct AppConfig {
    /// Default stroke size preset (S, M, L, XL, custom)
    pub stroke_size_preset: Option<String>,
    /// Default font size for text annotations
    pub font_size: Option<u32>,
    /// Sketchiness level for hand-drawn style (0 = clean, higher = more sketchy)
    pub sketchiness: Option<f64>,
    /// Default directory for saving images
    pub default_save_location: Option<String>,
    /// Automatically save to default location without showing dialog
    pub auto_save_to_default: Option<bool>,
    /// Close the app after saving
    pub close_after_save: Option<bool>,
    /// User's color palette (hex colors)
    pub palette: Option<Vec<String>>,
    /// Default save format ("png" or "jpg")
    pub default_save_format: Option<String>,
    /// Copy image to clipboard when saving
    pub copy_to_clipboard_on_save: Option<bool>,
    /// Close app after copying to clipboard (Ctrl+C)
    pub close_after_copy: Option<bool>,
    /// Enter select mode after drawing a shape
    pub select_mode_after_drawing: Option<bool>,
    /// Open folder location after saving
    pub open_folder_after_save: Option<bool>,
}

/// Loads config.yml from the config directory.
pub fn load_config() -> Result<Option<AppConfig>, String> {
    let config_dir = get_config_dir()?;
    let config_path = config_dir.join("config.yml");

    if !config_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config.yml: {}", e))?;

    let config: AppConfig =
        serde_yaml::from_str(&content).map_err(|e| format!("Failed to parse config.yml: {}", e))?;

    Ok(Some(config))
}

/// Saves settings to config.yml.
pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let config_dir = ensure_config_dir()?;
    let config_path = config_dir.join("config.yml");

    let yaml =
        serde_yaml::to_string(config).map_err(|e| format!("Failed to serialize config: {}", e))?;

    let header = "# Napkin Configuration\n\
                  # Edit this file to customize default settings.\n\
                  # Changes take effect on next app launch.\n\n";

    fs::write(&config_path, format!("{header}{yaml}"))
        .map_err(|e| format!("Failed to write config.yml: {}", e))?;

    Ok(())
}

/// Theme settings stored in theme.yml
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct ThemeConfig {
    /// Theme mode: "light", "dark", or "system"
    pub mode: Option<String>,
    /// Custom CSS to apply to the app
    pub custom_css: Option<String>,
}

/// Loads theme.yml from the config directory.
pub fn load_theme() -> Result<Option<ThemeConfig>, String> {
    let config_dir = get_config_dir()?;
    let theme_path = config_dir.join("theme.yml");

    if !theme_path.exists() {
        return Ok(None);
    }

    let content =
        fs::read_to_string(&theme_path).map_err(|e| format!("Failed to read theme.yml: {}", e))?;

    let theme: ThemeConfig =
        serde_yaml::from_str(&content).map_err(|e| format!("Failed to parse theme.yml: {}", e))?;

    Ok(Some(theme))
}

/// Saves theme settings to theme.yml.
pub fn save_theme(theme: &ThemeConfig) -> Result<(), String> {
    let theme_dir = ensure_config_dir()?;
    let theme_path = theme_dir.join("theme.yml");

    let yaml =
        serde_yaml::to_string(theme).map_err(|e| format!("Failed to serialize theme: {}", e))?;

    let header = "# Napkin Theme Configuration\n\
                  # \n\
                  # mode: \"light\", \"dark\", or \"system\"\n\
                  # custom_css: Custom CSS styles (use | for multiline)\n\
                  # \n\
                  # Example with custom CSS:\n\
                  # mode: dark\n\
                  # custom_css: |\n\
                  #   :root {\n\
                  #     --background: #1a1a2e;\n\
                  #     --foreground: #eaeaea;\n\
                  #   }\n\n";

    fs::write(&theme_path, format!("{header}{yaml}"))
        .map_err(|e| format!("Failed to write theme.yml: {}", e))?;

    Ok(())
}

/// Updates only the theme mode, preserving custom_css.
pub fn save_theme_mode(mode: &str) -> Result<(), String> {
    let current = load_theme()?.unwrap_or_default();
    let updated = ThemeConfig {
        mode: Some(mode.to_string()),
        custom_css: current.custom_css,
    };
    save_theme(&updated)
}

/// Updates only the custom CSS, preserving mode.
pub fn save_theme_custom_css(css: Option<String>) -> Result<(), String> {
    let current = load_theme()?.unwrap_or_default();
    let updated = ThemeConfig {
        mode: current.mode,
        custom_css: css,
    };
    save_theme(&updated)
}

/// Migrates old config files from Tauri's app_data_dir to XDG config.
pub fn migrate_from_app_data(app_data_dir: &PathBuf) -> Result<(), String> {
    let config_dir = ensure_config_dir()?;

    let old_settings = app_data_dir.join("settings.json");
    let new_config = config_dir.join("config.yml");
    if old_settings.exists() && !new_config.exists() {
        if let Ok(json) = fs::read_to_string(&old_settings) {
            if let Ok(settings) = serde_json::from_str::<serde_json::Value>(&json) {
                let config = AppConfig {
                    stroke_size_preset: settings
                        .get("strokeSizePreset")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    font_size: settings
                        .get("fontSize")
                        .and_then(|v| v.as_u64())
                        .map(|v| v as u32),
                    sketchiness: settings.get("sketchiness").and_then(|v| v.as_f64()),
                    default_save_location: settings
                        .get("defaultSaveLocation")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    auto_save_to_default: settings
                        .get("autoSaveToDefault")
                        .and_then(|v| v.as_bool()),
                    close_after_save: settings.get("closeAfterSave").and_then(|v| v.as_bool()),
                    palette: None,
                    default_save_format: None,
                    copy_to_clipboard_on_save: None,
                    close_after_copy: None,
                    select_mode_after_drawing: None,
                    open_folder_after_save: None,
                };
                let _ = save_config(&config);
                eprintln!("Migrated settings.json to {}", new_config.display());
            }
        }
    }

    let old_pref = app_data_dir.join("theme-preference.txt");
    let old_css = app_data_dir.join("theme.css");
    let new_theme = config_dir.join("theme.yml");
    if (old_pref.exists() || old_css.exists()) && !new_theme.exists() {
        let mode = fs::read_to_string(&old_pref)
            .ok()
            .map(|s| s.trim().to_string());
        let css = fs::read_to_string(&old_css)
            .ok()
            .filter(|s| !s.trim().is_empty());
        let theme = ThemeConfig {
            mode,
            custom_css: css,
        };
        let _ = save_theme(&theme);
        eprintln!("Migrated theme settings to {}", new_theme.display());
    }

    Ok(())
}
