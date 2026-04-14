# Napkin

A lightweight desktop image annotation tool built with Tauri 2. Users draw sketchy, hand-drawn style annotations on images using rough.js aesthetics.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite (rolldown-vite)
- **Desktop:** Tauri 2 (Rust backend)
- **Canvas:** Konva + react-konva
- **Sketch rendering:** rough.js, perfect-freehand
- **State:** Zustand + Zundo (undo/redo)
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide React
- **Animations:** Motion (framer-motion)

## Commands

- `bun run dev` — Start Vite dev server (port 1420)
- `bun run build` — Production build
- `bun run tauri dev -- -- --filename $(pwd)/test/image/01.png` — Run full Tauri app in dev mode with a specific image
- `bun run tauri build` — Build distributable desktop app
- `bun run format` — Format with oxfmt

## Project Structure

```
src/
├── components/
│   ├── canvas/                # Core canvas and annotation rendering
│   │   ├── hooks/drawing/     # Per-shape creator/updater functions (factory pattern)
│   │   ├── hooks/             # Canvas hooks (pan-zoom, export, keyboard, drawing handlers)
│   │   └── renderers/         # Per-annotation-type Konva renderers
│   ├── toolbar/               # Top toolbar (tools, colors, stroke, undo/redo)
│   ├── inspector/             # Right sidebar — selected annotation properties
│   ├── background/            # Left sidebar — background/decoration settings
│   ├── settings/              # Settings and customizer dialogs
│   ├── ocr/                   # OCR result dialog
│   └── ui/                    # Reusable UI primitives (shadcn/ui)
├── hooks/                     # App-level custom hooks
├── stores/                    # Zustand stores (6 total)
├── types/                     # TypeScript type definitions
├── lib/                       # Utilities (rough-draw, freehand, path-smoothing, coordinates)
├── constants/                 # Default colors, sizes, fonts
└── icons/                     # Icon utilities and fallbacks
src-tauri/                     # Rust backend, Tauri config, capabilities
```

## Architecture

### State Management

Six Zustand stores, each with a single responsibility:

- **annotation-store** — Annotation array with Zundo undo/redo (50-state limit)
- **canvas-store** — Active tool, colors, zoom, pan, selection, stroke width, sketchiness (auto-scaled to image diagonal)
- **theme-store** — Light/dark/system theme, custom CSS, persisted via Tauri
- **settings-store** — User preferences, persisted via Tauri `invoke("save_settings", ...)`
- **background-store** — Background type, gradients, padding, shadows, aspect ratio
- **icon-store** — Custom icon mappings, loaded/saved via Tauri

### Drawing Pipeline

1. Mouse events in `use-drawing-handlers.ts` check `activeTool` from canvas store
2. Tool-specific creator/updater dispatched via factory maps in `drawing/index.ts`
3. Annotation added to store → Zundo tracks history
4. Renderer dispatcher (`renderers/index.tsx`) routes to type-specific renderer
5. Each renderer uses Konva components + rough.js for sketchy appearance

### Key Patterns

- **Factory pattern** for drawing: `ANNOTATION_CREATORS[tool]` and `ANNOTATION_UPDATERS[tool]`
- **Renderer dispatch** via `renderAnnotation()` — single entry point, delegates to per-type renderer
- **Modifier keys:** Shift = constrain aspect ratio, Alt = draw from center
- **Responsive scaling:** Stroke width and sketchiness scale with image diagonal
- **Path simplification** for freehand/highlighter via `path-smoothing.ts`

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json and vite.config.ts).

## Code Style

### General Principles

- Write clean, readable code. Optimize for quick comprehension at a glance.
- Avoid overabstraction. No wrapper-of-wrapper-of-wrapper chains. Abstract only when a function is genuinely reused or the extraction meaningfully improves clarity.
- Three similar lines of code is better than a premature abstraction.
- Keep functions focused and short, but don't split them just for the sake of splitting.

### Readability Rules

- **No nested ternaries.** Use early returns, helper functions, or if/else blocks instead.
- Prefer explicit control flow over clever one-liners.
- Name variables and functions descriptively — the code should read like prose where possible.
- Keep conditional logic flat. If you're nesting more than two levels deep, restructure.

### TypeScript

- Strict mode is enabled. Respect it — no `any` unless absolutely unavoidable.
- Use discriminated unions for annotation types.
- Prefer `interface` for object shapes, `type` for unions and computed types.
- Don't add type annotations where TypeScript can infer them.

### React & Components

- Use functional components with hooks exclusively.
- Extract hooks when logic is reused or a component gets too long — but not preemptively.
- Compose with `cn()` (from `@/lib/utils`) for conditional class names.
- UI primitives live in `components/ui/` (shadcn/ui). Use them instead of reimplementing.
- Keep component files focused: one main export per file.

### State Management

- Access stores via hooks: `useAnnotationStore()`, `useCanvasStore()`, etc.
- Keep store actions colocated with their state in the store file.
- Use selectors to avoid unnecessary re-renders: `useCanvasStore(s => s.activeTool)`.

### Styling

- Tailwind CSS utility classes. No custom CSS unless necessary for dynamic values.
- Use CSS variables for theming (defined via Tailwind config).
- Dark mode support via Tailwind's `dark:` variant.

### Formatting & Commits

- Format with `oxfmt`.
- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Never add co-author lines to commit messages.
