// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "linux")]
fn configure_for_nvidia() {
    use std::path::Path;

    if Path::new("/proc/driver/nvidia/version").exists() {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }
}

#[cfg(not(target_os = "linux"))]
fn configure_for_nvidia() {}

fn main() {
    configure_for_nvidia();
    napkin_lib::run()
}
