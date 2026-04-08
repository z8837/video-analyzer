# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev (Vite renderer + Electron, hot-reload)
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint check
npm run dist         # Build + package for current platform
npm run dist:mac     # macOS universal DMG + ZIP
npm run dist:win     # Windows NSIS installer
```

For dev, Vite serves the renderer on `127.0.0.1:5173` and Electron waits for it before loading. There are no unit tests in this project.

## Architecture

This is an **Electron + React + Vite** desktop app (ES modules throughout). Its purpose is to batch-analyze local video files using the **Codex CLI** (OpenAI's `codex` tool) and browse the results.

### Process Split

- **Renderer** (`src/`): Single-component React app (`App.tsx`). All UI state lives here — settings panel, folder tree, analysis result grid, video player, progress overlay.
- **Main process** (`electron/main.mjs`): All filesystem and subprocess work. Never import Node APIs into the renderer.
- **Preload** (`electron/preload.cjs`): Exposes `window.codexVideoAnalyzer` as the IPC bridge. All renderer↔main communication goes through this API.

### IPC API surface (`window.codexVideoAnalyzer`)

Defined in `preload.cjs`, typed in `src/global.d.ts`, implemented as `ipcMain.handle()` calls in `main.mjs`:

- Settings: `getSettings()`, `saveSettings(patch)`
- Environment: `getEnvironmentStatus()`, `prepareEnvironment(patch)` — checks for Codex CLI, ffmpeg/ffprobe, ChatGPT login
- Folders: `loadFolderTree(rootPath)`, `getVideosByFolder(folderPath)`
- Analysis: `loadAnalysis(folderPath)`, `startAnalysis(folderPath)`, `cancelAnalysis()`
- Events: `onAnalysisEvent(listener)` — returns unsubscribe fn; used for real-time progress

### Analysis Pipeline

1. User picks a root folder → `loadFolderTree` scans recursively (ignores `analyze/`, `.git`, `.codex`, `node_modules`)
2. "Analyze" clicked → main process collects video metadata via `ffprobe`, writes `analyze/_task.json`
3. Main spawns `codex exec` with `codex-assets/instructions.md` as the prompt template
4. Codex returns a JSON blob; main parses it and writes individual markdown files under `analyze/_library/{relative-folder}/{video}.md`
5. Analysis events stream back to the renderer via IPC events during processing

### File System Layout (runtime)

```
<root>/
  analyze/
    _task.json              # Pending analysis batch (transient)
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
