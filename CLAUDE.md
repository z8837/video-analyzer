# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start dev (Vite renderer + Electron, hot-reload)
npm run build            # TypeScript check + Vite production build
npm run lint             # ESLint check
npm run dist             # Build + package for current platform
npm run dist:win         # Windows NSIS installer
npm run dist:mac         # macOS DMG + ZIP (universal)
npm run dist:mac:arm64   # macOS arm64 only
npm run dist:mac:universal # macOS universal binary
```

For dev, Vite serves the renderer on `127.0.0.1:5173` and Electron waits for it before loading. There are no unit tests in this project. Build output goes to `release/`.

## Architecture

This is an **Electron + React + Vite** desktop app (ES modules throughout). Its purpose is to batch-analyze local video files using the **Codex CLI** (OpenAI's `codex` tool) and browse the results.

### Process Split

- **Renderer** (`src/`): Single-component React app (`App.tsx`). All UI state lives here — settings panel, folder tree, analysis result grid, video player, progress overlay.
- **Main process** (`electron/main.mjs`): All filesystem and subprocess work. Never import Node APIs into the renderer.
  - `electron/library-data.mjs`: Pure filesystem/path helpers (folder scanning, JSON read/write, video extension list, path normalization).
  - `electron/library-runtime.mjs`: Analysis state machine (task file writing, library entry reading/writing, resume logic, progress tracking).
- **Preload** (`electron/preload.cjs`): Exposes `window.codexVideoAnalyzer` as the IPC bridge. All renderer↔main communication goes through this API.

### IPC API surface (`window.codexVideoAnalyzer`)

Defined in `preload.cjs`, typed in `src/global.d.ts`, implemented as `ipcMain.handle()` calls in `main.mjs`:

- Settings: `getSettings()`, `saveSettings(patch)`
- Environment: `getEnvironmentStatus()`, `prepareEnvironment(patch)` — checks for Codex CLI, ffmpeg/ffprobe, ChatGPT login
- Folders: `pickRootFolder()`, `loadFolderTree(rootPath)`, `loadFolderVideos(rootPath, folderPath)`
- Analysis: `loadAnalysis(folderPath)`, `loadAnalysisProgress(folderPath)`, `startAnalysis(folderPath)`, `cancelAnalysis()`
- Shell: `startDragFile(filePath, iconPath?)`, `showItemInFolder(targetPath)`, `openPath(targetPath)`
- Events: `onAppEvent(listener)`, `onAnalysisEvent(listener)` — each returns an unsubscribe fn

### Analysis Pipeline

1. User picks a root folder → `loadFolderTree` scans recursively (ignores `analyze/`, `.git`, `.codex`, `node_modules`)
2. "Analyze" clicked → main process collects video metadata via `ffprobe`, writes `analyze/_task.json`
3. Main spawns `codex exec` with `codex-assets/instructions.md` as the prompt template. Model (`codexModel`), reasoning effort (`codexReasoningEffort`), parallel count (`maxParallelAnalysis`), and auto-stop failure limit (`consecutiveFailureLimit`) are all user-configurable via `ToolSettings` (settings panel). Defaults: `gpt-5.4` / `medium` / 5 / 5. `handleWorkerClose` tracks `runState.consecutiveFailures`; when it hits the limit, `triggerAutoStop` drains the pending queue and kills remaining workers to avoid wasting tokens after a usage-limit hit.
4. Codex returns a JSON blob; main parses it and writes individual markdown files under `analyze/_library/{relative-folder}/{video}.md`
5. Progress is tracked in `analyze/progress.json`; run logs go to `analyze/runs/`
6. Analysis events stream back to the renderer via IPC events during processing; previously completed files are reused (resume support)

### File System Layout (runtime)

```
<root>/
  analyze/
    _task.json              # Pending analysis batch (transient)
    progress.json           # Live progress state
    runs/                   # Per-run log files
    _library/
      <folder>/
        <video>.md          # Per-video analysis result
```

### Key Types (`src/types.ts`)

- `ToolSettings` — stored in Electron `userData`; holds `codexCommand`, `ffmpegCommand`, `lastRootPath`
- `AnalysisVideo` — output schema from Codex; all user-facing text (title, summary, details, categories, keywords) is Korean
- `FolderTreeNode` — recursive tree with direct/total video counts
- `AnalysisData` — container for all loaded `AnalysisVideo` records from a folder

### Custom Protocol

A `codex-media://` protocol handler in `main.mjs` serves local video files and images to the renderer, bypassing file:// restrictions.

### Codex Prompt

`codex-assets/instructions.md` is the fixed prompt sent to Codex CLI. It specifies the output JSON schema and enforces Korean-language output. Bundled into the app package via `electron-builder` `extraResources`.

## Prerequisites

- Node.js 24+
- Codex CLI installed and authenticated (`codex login`)
- ffmpeg + ffprobe on PATH (macOS: auto-installed if missing; Windows: must be pre-installed)
