# Repository Guidelines

## Project Structure & Module Organization

This is an Electron + React + Vite desktop app for analyzing local video folders with Codex CLI.

- `src/`: React renderer code. `App.tsx` contains the main UI, `types.ts` defines the IPC-facing data contracts, and `global.d.ts` types `window.codexVideoAnalyzer`.
- `electron/`: Electron main/preload code and filesystem helpers. Keep Node APIs here, not in the renderer.
- `codex-assets/`: Prompt and example analysis assets bundled into packaged builds.
- `public/` and `src/assets/`: Static icons and renderer assets.
- `scripts/`: Platform helper scripts, currently macOS build support.
- `screen/`: UI screenshots/reference images.

Runtime analysis output is written under the selected library root, for example `analyze/_library/videos/example_mp4__videos.md`.

## Build, Test, and Development Commands

- `npm install`: Install dependencies from `package-lock.json`.
- `npm run dev`: Start Vite on `127.0.0.1:5173` and launch Electron.
- `npm run build`: Run TypeScript project checks and create a production renderer build.
- `npm run lint`: Run ESLint across the repository.
- `npm run dist`: Build and package for the current platform.
- `npm run dist:win`, `npm run dist:mac`, `npm run dist:mac:arm64`: Platform-specific packaging commands.

## Coding Style & Naming Conventions

Use TypeScript/TSX for renderer code and ES modules for Electron main files. Prefer 2-space indentation, single quotes, and descriptive camelCase identifiers. React components use PascalCase. IPC method names should stay typed in `src/types.ts`, exposed in `electron/preload.cjs`, and implemented in `electron/main.mjs` together.

Keep local filesystem access and subprocess calls in `electron/main.mjs` or helper modules. The renderer should communicate only through `window.codexVideoAnalyzer`.

## Testing Guidelines

There is no unit test suite yet. Before submitting changes, run `npm run build` and `npm run lint`. For UI work, also run `npm run dev` and verify folder selection, video playback, analysis status badges, and Codex progress events manually.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries such as `search filter`, `analyze path`, and `Update README.md`. Keep commit messages brief and focused on one change.

Pull requests should include a concise description, the commands run, any manual verification steps, and screenshots for visible UI changes. Mention platform-specific impact when touching Electron packaging, `ffmpeg`, Codex CLI invocation, or local file access.

## Security & Configuration Tips

Do not commit generated `analyze/` outputs, release artifacts, credentials, or user library paths. Codex CLI, `ffmpeg`, and `ffprobe` paths are user settings stored in Electron `userData`. Preserve the `codex-media://` protocol flow for serving local media safely to the renderer.
