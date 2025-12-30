# Annotate

A lightweight desktop app for annotating images. Built with Tauri.

## Features

- Freehand drawing with pressure sensitivity
- Shapes: rectangles, circles, arrows (with adjustable bend)
- Text annotations
- Highlighter tool
- Sketchy hand-drawn style (powered by rough.js)
- Customizable themes (includes Rosé Pine presets)
- OCR text extraction
- Undo/redo support
- Export to PNG

## Building

Requires [Rust](https://rustup.rs/), [Bun](https://bun.sh/), and platform-specific dependencies.

### Linux (Debian/Ubuntu)

```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### Linux (Fedora)

```bash
sudo dnf install webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel
```

### macOS

```bash
xcode-select --install
```

### Install and run

```bash
bun install
bun tauri dev
```

### Build for release

```bash
bun tauri build
```

Output will be in `src-tauri/target/release/bundle/`.

## Tech Stack

- Tauri 2
- React 19
- TypeScript
- Konva (canvas rendering)
- rough.js (sketchy style)
- perfect-freehand (pen strokes)
- Zustand (state management)
- Tailwind CSS 4
