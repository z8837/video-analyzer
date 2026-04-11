# macOS Build

This project can generate a macOS desktop package, but the actual macOS build must run on a Mac.

## What to copy to the Mac

Copy the whole `codex-video-analyzer` project folder.

## Requirements on the Mac

1. Node.js 24+
2. Codex CLI
3. ffmpeg and ffprobe
4. `codex login`

Examples for Apple Silicon:

```bash
brew install node ffmpeg
npm install -g @openai/codex
codex login
```

## Build commands

Current Mac architecture:

```bash
npm install
npm run dist:mac
```

Apple Silicon only:

```bash
npm install
npm run dist:mac:arm64
```

Universal build:

```bash
npm install
npm run dist:mac:universal
```

Finder double-click helper:

```bash
./scripts/build-macos.command
```

## Output

Artifacts are written to the `release/` folder.

Typical outputs:

- `Codex Video Analyzer-0.2.1-mac-arm64.dmg`
- `Codex Video Analyzer-0.2.1-mac-arm64.zip`
- `Codex Video Analyzer-0.2.1-mac-universal.dmg`
- `Codex Video Analyzer-0.2.1-mac-universal.zip`

## Notes

- This app uses local Codex CLI with `gpt-5.4` and reasoning effort `xhigh`.
- With ChatGPT login based Codex CLI, a snapshot model like `gpt-5.4-2026-03-05` cannot be pinned.
- Native-host mac builds reuse the local Electron bundle from `node_modules/electron/dist`, so `npm run dist:mac` can package without re-downloading Electron.
- Finder-launched apps on macOS may not inherit shell `PATH`. If Codex or ffmpeg is not detected, enter their absolute paths in the app settings.
