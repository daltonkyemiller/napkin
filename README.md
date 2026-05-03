# Napkin

Napkin is a small desktop app for marking up screenshots and images.

It is built for the common case: open an image, draw a rough arrow or circle, add a short note, maybe put it on a nicer background, then save or copy the result. The annotations intentionally look a little hand-drawn instead of perfectly mechanical.

The app is a Tauri 2 desktop app with a React canvas frontend. It is still a local-first tool, not a hosted image editor.

## Demo

https://github.com/user-attachments/assets/f0c4260a-caae-4e82-b605-b926b0b5067f

## What It Does

- Draw rough rectangles, circles, arrows, freehand strokes, and highlighter marks.
- Add editable text annotations.
- Crop the image and undo the crop.
- Select, move, transform, and delete annotations.
- Bend arrows after drawing.
- Adjust rectangle corner radius, stroke width, sketchiness, and blend mode from the inspector.
- Use stroke presets that scale against the image size, or set an exact custom stroke width.
- Tune sketchiness from clean to heavy.
- Extract text from a selected image region with OCR.
- Export PNG or JPG.
- Copy the rendered image to the clipboard.
- Auto-save to a default folder, copy after save, close after save/copy, and reveal the saved file.
- Add gradient or image backgrounds, padding, border radius, shadow, blur, and aspect ratio framing.
- Save user settings under the XDG config directory.
- Customize the app theme with shadcn-style CSS variables.
- Map toolbar icons to local SVG files.

## Screenshot Workflow

Napkin accepts an image path from the CLI:

```sh
bun run tauri dev -- -- --filename ./test/image/01.png
```

It also accepts image bytes on stdin. This is useful with screenshot tools:

```sh
grim -g "$(slurp)" - | napkin --filename -
```

For scripted flows, pass an output file:

```sh
napkin --filename ./screenshot.png --output-filename ./annotated.png
```

Napkin opens a borderless always-on-top window. On startup it sizes itself to roughly a 16:9 window on the monitor under the cursor. Add `--fullscreen` if you want the Tauri window to go fullscreen.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| `V` | Select |
| `C` | Circle |
| `R` | Rectangle |
| `A` | Arrow |
| `T` | Text |
| `P` | Freehand |
| `M` | Highlighter |
| `O` | OCR selection |
| `X` | Crop |
| `B` | Toggle background panel |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo |
| `Ctrl+Y` / `Cmd+Y` | Redo |
| `Delete` / `Backspace` | Delete selected annotations |
| `Arrow keys` / `H J K L` | Move selected annotations by 1px |
| `Shift` + movement | Move selected annotations by 10px |
| `Ctrl+S` / `Cmd+S` | Save using the default format |
| `Ctrl+C` / `Cmd+C` | Copy the image when nothing is selected |
| `Ctrl+,` / `Cmd+,` | Settings |
| `Ctrl+0` / `Cmd+0` | Reset zoom |
| `Esc` | Clear selection and return to select |

While drawing shapes, `Shift` constrains the shape and `Alt` draws from the center when the tool supports it.

## Tools

### Select

Use select mode to move annotations, resize them, rotate them, and edit shape-specific handles.

Arrows have draggable endpoint handles. Rectangles have a corner-radius handle. The inspector edits stroke width, roughness, blend mode, text font, and text size for the selected item. Text can also be edited inline by double-clicking it.

### Shapes

Circle, rectangle, and arrow annotations use `rough.js` so they keep the sketchy style. Stroke width and sketchiness are stored per annotation, so changing the toolbar affects new annotations and selected annotations without rewriting the whole canvas.

### Freehand And Highlighter

Freehand strokes use `perfect-freehand` for pressure-aware paths. Highlighter paths are simplified after drawing so long strokes do not keep every raw pointer sample.

### Text

Text annotations use the default app font unless changed through the inspector. System fonts are loaded from the Rust side with `font-kit`.

### OCR

The OCR tool lets you drag a region and send it to Tesseract through the Rust backend. It currently uses English (`eng`). The result can be inserted back into the canvas as a text annotation.

If OCR fails on a local build, check that Tesseract and its English language data are installed on the machine.

### Crop

The crop tool replaces the image with the selected region and shifts existing annotations into the new coordinate space. Crop undo is separate from annotation redo because the image dimensions change.

## Backgrounds

The background panel is for turning a plain screenshot into something worth sharing.

You can keep the raw image, place it on one of the built-in gradient presets, or use a custom background image. Background export includes padding, aspect ratio framing, rounded image corners, shadows, and optional blur for image backgrounds.

Available ratios are `auto`, `16:9`, `4:3`, `1:1`, `9:16`, and `3:4`.

## Settings

Settings are stored as YAML under:

```text
$XDG_CONFIG_HOME/napkin/
```

If `XDG_CONFIG_HOME` is not set, Napkin uses:

```text
~/.config/napkin/
```

The main files are:

```text
config.yml
theme.yml
icons.yml
```

`config.yml` stores defaults like stroke size, font size, sketchiness, save location, save format, palette, and save/copy behavior.

`theme.yml` stores light/dark/system mode and optional custom CSS.

`icons.yml` stores local SVG mappings for toolbar and UI icons.

Older settings from Tauri's app data directory are migrated into the XDG config directory on startup.

## Clipboard Notes

Clipboard copy is handled by the Rust backend because image clipboard support differs by platform.

On Linux, Napkin tries `wl-copy` first, then falls back to `xclip`.

On macOS, it uses `osascript`.

On Windows, it uses PowerShell and `System.Windows.Forms.Clipboard`.

If copying silently does nothing on Linux, install `wl-clipboard` for Wayland or `xclip` for X11.

## Development

Install dependencies:

```sh
bun install
```

Run the frontend only:

```sh
bun run dev
```

Run the full desktop app:

```sh
bun run tauri dev -- -- --filename "$(pwd)/test/image/01.png"
```

Build the frontend:

```sh
bun run build
```

Build the desktop bundle:

```sh
bun run tauri build
```

Format the frontend:

```sh
bun run format
```

## Native Dependencies

For normal frontend work, Bun and Node-compatible tooling are enough.

For the full Tauri app, you also need Rust and the normal Tauri 2 system dependencies for your platform.

For OCR and image handling, the Rust side uses:

- `rusty-tesseract`
- `image`
- `turbojpeg`
- `font-kit`

Depending on the OS, local Tauri builds may need native libraries for Tesseract, Leptonica, and TurboJPEG installed through the system package manager.

## Project Layout

```text
src/
  components/
    background/      background panel and framing controls
    canvas/          Konva stage, drawing handlers, crop/OCR hooks, renderers
    inspector/       selected annotation controls
    ocr/             OCR result dialog
    settings/        app settings, theme, and icon customization
    toolbar/         main drawing toolbar
    ui/              local UI primitives
  constants/         default colors, font names, shared constants
  hooks/             app-level hooks
  icons/             icon names and lucide fallbacks
  lib/               rough drawing, path smoothing, coordinates, utilities
  stores/            Zustand stores
  types/             annotation and tool types

src-tauri/
  src/
    config.rs        XDG config files and migration
    icons.rs         local SVG icon loading and scanning
    lib.rs           CLI args, Tauri commands, OCR, clipboard, window setup
```

## Architecture

The frontend state is split across focused Zustand stores:

- `annotation-store` holds annotations and wraps them with Zundo undo/redo.
- `canvas-store` tracks active tool, image metadata, zoom, pan, selection, stroke settings, sketchiness, OCR selection, and crop history.
- `background-store` owns gradient/image background settings and export framing.
- `settings-store` persists user preferences through Tauri commands.
- `theme-store` persists theme mode and custom CSS.
- `icon-store` persists local SVG icon mappings.

The drawing path is intentionally plain:

1. Mouse events enter `use-drawing-handlers.ts`.
2. The active tool decides which creator or updater to call.
3. Creator/updater functions live in `components/canvas/hooks/drawing/`.
4. Annotation state changes go through `annotation-store`.
5. `renderAnnotation()` dispatches to the matching renderer in `components/canvas/renderers/`.

The renderers use Konva nodes for interaction and canvas drawing for rough or freehand output. The app keeps annotation coordinates in image space, then applies the current canvas layout scale at render time.

Export goes through `use-canvas-export.ts`, which hides selection UI before rendering the stage to PNG or JPG.

## Code Style

The project is TypeScript-first and uses strict mode. Keep the code readable before getting clever.

Some local conventions:

- Use the `@/` path alias for app imports.
- Use store selectors for focused subscriptions when touching hot UI paths.
- Keep drawing behavior in the drawing hook and per-tool creator/updater files.
- Keep renderer-specific code in `components/canvas/renderers/`.
- Use shadcn-style primitives from `components/ui/` instead of adding one-off UI controls.
- Use Tailwind utilities unless dynamic CSS is actually needed.
- Run `bun run format` before committing frontend changes.

## Current Rough Edges

The app is useful, but it is still young.

There is no automated test suite yet. Build checks catch TypeScript and bundling problems, but interaction-heavy canvas work still needs manual testing in the Tauri app.

Redo is annotation-focused. Crop undo is supported, but crop redo is not.

OCR is English-only right now.

The frontend bundle is large because this is a desktop app pulling in Konva, rough rendering, fonts, and the UI stack. That is acceptable for now, but it is visible in Vite's chunk-size warning.
