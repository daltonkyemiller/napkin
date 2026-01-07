# Napkin

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
- Export to PNG/JPEG
- Copy to clipboard (cross-platform)
- Read images from stdin (pipe from `grim`, etc.)

## Tech Stack

- Tauri 2
- React 19
- TypeScript
- Konva (canvas rendering)
- rough.js (sketchy style)
- perfect-freehand (pen strokes)
- Zustand (state management)
- Tailwind CSS 4
