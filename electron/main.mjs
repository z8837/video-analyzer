import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, shell } from 'electron'
import { spawn } from 'node:child_process'
import { mkdirSync, promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import {
  collectVideoFolders,
  fileExists,
  getAnalyzePaths,
  getProjectRootPath,
  isSameOrChildPath,
  readJsonIfExists,
  readTextIfExists,
  toPosixPath,
  writeJson,
} from './library-data.mjs'
import {
  getCompletedPendingSources,
  getResumeContext,
  parseAnalysisBatchResponse,
  readLibraryEntries,
  writePendingAnalysesFromReport,
  writeTaskFile,
} from './library-runtime.mjs'

const FIXED_MODEL = 'gpt-5.4'
const FIXED_REASONING = 'xhigh'
const ANALYSIS_CHANNEL = 'analysis:event'
const APP_CHANNEL = 'app:event'
const LOCAL_ASSET_SCHEME = 'codex-media'

let mainWindow = null
let activeRun = null

protocol.registerSchemesAsPrivileged([
  {
    scheme: LOCAL_ASSET_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
])

configureStoragePaths()

function isWindows() {
  return process.platform === 'win32'
}

function normalizePathForConfig(filePath) {
  return filePath.replace(/\\/g, '/')
}

function sanitizeError(error) {
  return error instanceof Error ? error.message : String(error)
}

function configureStoragePaths() {
  const userDataPath = app.isPackaged
    ? app.getPath('userData')
    : path.join(app.getPath('appData'), 'Codex Video Analyzer Dev')

  if (!app.isPackaged) {
    app.setPath('userData', userDataPath)
  }

  const sessionDataPath = path.join(userDataPath, 'session-data')
  mkdirSync(sessionDataPath, { recursive: true })
  app.setPath('sessionData', sessionDataPath)
}

function getDefaultSettings() {
  return {
    codexCommand: isWindows() ? 'codex.cmd' : 'codex',
    ffmpegCommand: isWindows() ? 'ffmpeg.exe' : 'ffmpeg',
    lastRootPath: '',
  }
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

async function loadSettings() {
  try {
    const raw = await fs.readFile(getSettingsPath(), 'utf8')
    return { ...getDefaultSettings(), ...JSON.parse(raw) }
  } catch {
    return getDefaultSettings()
  }
}

async function saveSettings(patch) {
  const merged = { ...(await loadSettings()), ...patch }
  await fs.writeFile(getSettingsPath(), JSON.stringify(merged, null, 2), 'utf8')
  return merged
}

function getAssetPath(...segments) {
  const baseDir = app.isPackaged
    ? path.join(process.resourcesPath, 'codex-assets')
    : path.join(app.getAppPath(), 'codex-assets')
  return path.join(baseDir, ...segments)
}

function getDerivedFfprobeCommand(ffmpegCommand) {
  if (path.isAbsolute(ffmpegCommand)) {
    const extension = path.extname(ffmpegCommand)
    return path.join(
      path.dirname(ffmpegCommand),
      `ffprobe${extension || (isWindows() ? '.exe' : '')}`,
    )
  }

  return ffmpegCommand.endsWith('.exe') ? 'ffprobe.exe' : 'ffprobe'
}

function buildChildEnv(settings) {
  const pathEntries = (process.env.PATH || '').split(path.delimiter).filter(Boolean)
  const extraDirs = [
    settings.codexCommand,
    settings.ffmpegCommand,
    getDerivedFfprobeCommand(settings.ffmpegCommand),
  ]
    .filter((command) => path.isAbsolute(command))
    .map((command) => path.dirname(command))

  return {
    ...process.env,
    PATH: [...new Set([...extraDirs, ...pathEntries])].join(path.delimiter),
  }
}

function spawnCommand(command, args, options = {}) {
  const useShell = isWindows() && /\.(cmd|bat)$/i.test(command)
  return spawn(command, args, {
    shell: useShell,
    windowsHide: true,
    ...options,
  })
}

function runCommand(command, args, env) {
  return new Promise((resolve) => {
    const child = spawnCommand(command, args, { env })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      resolve({ ok: false, code: null, stdout, stderr, error: error.message })
    })

    child.on('close', (code) => {
      resolve({ ok: code === 0, code, stdout, stderr, error: '' })
    })
  })
}

function buildFileUrl(filePath, cacheKey = '') {
  const url = new URL(`${LOCAL_ASSET_SCHEME}://local/`)
  url.searchParams.set('path', filePath)
  if (cacheKey) {
    url.searchParams.set('v', cacheKey)
  }
  return url.href
}

async function buildAnalysisVideo(projectRootPath, analyzeDir, entry) {
  const absoluteVideoPath = path.join(projectRootPath, entry.record.source)
  let videoUrl = buildFileUrl(absoluteVideoPath)
  let sampleImagePath = ''
  let sampleImageUrl = ''

  try {
    const videoStat = await fs.stat(absoluteVideoPath)
    videoUrl = buildFileUrl(absoluteVideoPath, String(Math.floor(videoStat.mtimeMs)))
  } catch {
    // Keep a bare URL if the source video is currently missing.
  }

  if (entry.record.sampleImage) {
    const resolvedSamplePath = path.isAbsolute(entry.record.sampleImage)
      ? entry.record.sampleImage
      : path.join(analyzeDir, entry.record.sampleImage)
    if (await fileExists(resolvedSamplePath)) {
      const stat = await fs.stat(resolvedSamplePath)
      sampleImagePath = resolvedSamplePath
      sampleImageUrl = buildFileUrl(resolvedSamplePath, String(Math.floor(stat.mtimeMs)))
    }
  }

  return {
    fileName: entry.record.fileName,
    relativePath: entry.record.source,
    folderRelativePath: entry.record.folderRelativePath,
    durationSeconds: entry.record.durationSeconds ?? undefined,
    width: entry.record.width ?? undefined,
    height: entry.record.height ?? undefined,
    fps: entry.record.fps ?? undefined,
    hasAudio: entry.record.hasAudio ?? undefined,
    title: entry.record.title,
    summary: entry.record.summary,
    details: entry.record.details,
    categories: entry.record.categories,
    keywords: entry.record.keywords,
    sampleImage: entry.record.sampleImage || '',
    analysisFile: toPosixPath(path.relative(analyzeDir, entry.markdownPath)),
    skippedFromExisting: false,
    absolutePath: absoluteVideoPath,
    videoUrl,
    analysisFilePath: entry.markdownPath,
    analysisMarkdown: entry.markdown,
    sampleImagePath,
    sampleImageUrl,
    generatedAt: entry.record.generatedAt || '',
    model: entry.record.model || FIXED_MODEL,
    reasoningEffort: entry.record.reasoningEffort || FIXED_REASONING,
  }
}

async function loadAnalysis(projectRootPath) {
  if (!projectRootPath) {
    return { exists: false, folderPath: '', directVideoCount: 0, videos: [] }
  }

  const { analyzeDir } = getAnalyzePaths(projectRootPath)
  const { entries, generatedAt } = await readLibraryEntries(projectRootPath)
  const videos = await Promise.all(
    entries.map((entry) => buildAnalysisVideo(projectRootPath, analyzeDir, entry)),
  )

  return {
    exists: videos.length > 0,
    folderPath: projectRootPath,
    directVideoCount: videos.length,
    generatedAt,
    model: FIXED_MODEL,
    reasoningEffort: FIXED_REASONING,
    schemaVersion: 1,
    videos,
  }
}

async function writeProgressFile(folderPath, progressPatch) {
  const { progressPath } = getAnalyzePaths(folderPath)
  const current = (await readJsonIfExists(progressPath)) ?? {}
  const totalFiles = progressPatch.totalFiles ?? current.totalFiles ?? 0
  const reusableFiles = progressPatch.reusableFiles ?? current.reusableFiles ?? 0
  const completedFiles = progressPatch.completedFiles ?? current.completedFiles ?? 0
  const pendingFiles =
    progressPatch.pendingFiles ??
    current.pendingFiles ??
    Math.max(totalFiles - reusableFiles - completedFiles, 0)
  const activeWorkTotal = completedFiles + pendingFiles
  const computedPercent =
    activeWorkTotal > 0
      ? Math.min(99, Math.round((completedFiles / activeWorkTotal) * 100))
      : progressPatch.status === 'completed'
        ? 100
        : 0

  const next = {
    schemaVersion: 1,
    folderPath,
    status: progressPatch.status ?? current.status ?? 'idle',
    totalFiles,
    reusableFiles,
    completedFiles,
    pendingFiles,
    percent: progressPatch.percent ?? computedPercent,
    currentFile: progressPatch.currentFile ?? current.currentFile ?? '',
    message: progressPatch.message ?? current.message ?? '',
    updatedAt: new Date().toISOString(),
  }

  await writeJson(progressPath, next)
  return next
}

async function loadAnalysisProgress(folderPath) {
  const progress = await readJsonIfExists(getAnalyzePaths(folderPath).progressPath)
  if (!progress) {
    return {
      exists: false,
      folderPath,
      status: 'idle',
      totalFiles: 0,
      reusableFiles: 0,
      completedFiles: 0,
      pendingFiles: 0,
      percent: 0,
      currentFile: '',
      message: '',
      updatedAt: '',
    }
  }

  return { exists: true, ...progress }
}

function emitAnalysisEvent(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(ANALYSIS_CHANNEL, payload)
  }
}

function emitAppEvent(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(APP_CHANNEL, payload)
  }
}

async function chooseBaseFolderFromMenu() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return
  }

  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
  if (result.canceled || result.filePaths.length === 0) {
    return
  }

  const rootPath = result.filePaths[0]
  const settings = await saveSettings({ lastRootPath: rootPath })
  emitAppEvent({ type: 'base-folder-selected', rootPath, settings })
}

function buildAppMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: '기본 폴더 선택...',
          accelerator: 'CmdOrCtrl+O',
          click: () => void chooseBaseFolderFromMenu(),
        },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ])
}

function buildPromptWithContext(projectRootPath, sourceFolderPath, resumeContext) {
  const taskFilePath = path.join(projectRootPath, 'analyze', '_task.json')

  return [
    `The current working directory is "${projectRootPath}".`,
    `The selected source folder is "${sourceFolderPath}".`,
    `The selected source folder relative to the project root is "${resumeContext.folderRelativePath}".`,
    `Read "${taskFilePath}" and analyze only the pending videos listed there.`,
    `Reuse count for this run: ${resumeContext.reusableCount}. Pending new analyses: ${resumeContext.pendingCount}.`,
    'Do not inspect unrelated repository files or scan the whole project.',
    'Do not create or update any markdown files yourself.',
    'Do not create or update analyze/results.json, analyze/index.md, preview videos, or permanent sample-sheet images.',
    'Keep the workflow short: metadata plus a few representative frames per video are enough unless absolutely necessary.',
    'On Windows, never embed Korean literals inside PowerShell command strings or here-strings.',
    'Keep Korean text only in your final response JSON. The desktop app will write the UTF-8 markdown files for you.',
    'Your final response must be exactly one JSON object and nothing else.',
    'Use this shape: {"schemaVersion":1,"message":"짧은 한국어 완료 문장","analyses":[...]}',
    'Each analyses item must contain source, fileName, title, summary, details, categories, keywords, durationSeconds, width, height, fps, hasAudio, sampleImage, generatedAt, model, reasoningEffort.',
    'The analyses array must contain one item for every pending video from analyze/_task.json and source must exactly match the task file.',
  ].join('\n')
}

async function refreshActiveRunProgress(runState) {
  const completedSources = await getCompletedPendingSources(
    runState.folderPath,
    runState.resumeContext.pendingVideos,
  )
  const completedFiles = completedSources.size
  const pendingFiles = Math.max(runState.resumeContext.pendingCount - completedFiles, 0)
  const percent =
    runState.resumeContext.pendingCount > 0
      ? Math.min(99, Math.round((completedFiles / runState.resumeContext.pendingCount) * 100))
      : 100
  const nextPending = runState.resumeContext.pendingVideos.find(
    (video) => !completedSources.has(video.source),
  )

  await writeProgressFile(runState.folderPath, {
    status: 'running',
    totalFiles: runState.resumeContext.totalFiles,
    reusableFiles: runState.resumeContext.reusableCount,
    completedFiles,
    pendingFiles,
    percent,
    currentFile: nextPending?.source || '',
    message:
      completedFiles > 0
        ? `신규 분석 ${completedFiles}/${runState.resumeContext.pendingCount}개 완료`
        : `${runState.resumeContext.pendingCount}개 파일 분석을 시작합니다.`,
  })
}

function startProgressPolling(runState) {
  const tick = async () => {
    if (!activeRun || activeRun !== runState || runState.cancelRequested) {
      return
    }

    try {
      await refreshActiveRunProgress(runState)
    } catch {
      // Ignore transient progress errors.
    }

    runState.pollTimer = setTimeout(() => {
      void tick()
    }, 900)
  }

  void tick()
}

function stopProgressPolling(runState) {
  if (runState.pollTimer) {
    clearTimeout(runState.pollTimer)
    runState.pollTimer = null
  }
}

async function startAnalysis(sourceFolderPath) {
  if (activeRun) {
    throw new Error('이미 다른 폴더 분석이 실행 중입니다.')
  }

  const settings = await loadSettings()
  const projectRootPath = getProjectRootPath(settings, sourceFolderPath)
  if (!isSameOrChildPath(projectRootPath, sourceFolderPath)) {
    throw new Error('선택한 폴더가 기본 디렉토리 밖에 있습니다.')
  }

  const resumeContext = await getResumeContext(projectRootPath, sourceFolderPath)
  await writeTaskFile(projectRootPath, resumeContext)
  await writeProgressFile(projectRootPath, {
    status: resumeContext.pendingCount > 0 ? 'running' : 'completed',
    totalFiles: resumeContext.totalFiles,
    reusableFiles: resumeContext.reusableCount,
    completedFiles: 0,
    pendingFiles: resumeContext.pendingCount,
    percent: resumeContext.pendingCount > 0 ? 0 : 100,
    currentFile: resumeContext.pendingVideos[0]?.source || '',
    message:
      resumeContext.pendingCount > 0
        ? `${resumeContext.pendingCount}개 파일 분석을 시작합니다.`
        : '이미 분석된 Markdown 결과를 그대로 사용했습니다.',
  })

  if (resumeContext.pendingCount === 0) {
    emitAnalysisEvent({ type: 'started', folderPath: projectRootPath, model: FIXED_MODEL, reasoningEffort: FIXED_REASONING })
    emitAnalysisEvent({
      type: 'completed',
      folderPath: projectRootPath,
      code: 0,
      finalMessage: '같은 영상은 다시 분석하지 않고 기존 Markdown 결과를 사용했습니다.',
      analysis: await loadAnalysis(projectRootPath),
    })
    return { ok: true }
  }

  const env = buildChildEnv(settings)
  const instructionsPath = getAssetPath('instructions.md')
  const outputLastMessagePath = path.join(app.getPath('temp'), `codex-video-analyzer-${Date.now()}-last-message.txt`)
  const child = spawnCommand(
    settings.codexCommand,
    [
      'exec',
      '--full-auto',
      '--skip-git-repo-check',
      '--ephemeral',
      '--color',
      'never',
      '-C',
      projectRootPath,
      '-m',
      FIXED_MODEL,
      '-c',
      `model_reasoning_effort=${JSON.stringify(FIXED_REASONING)}`,
      '-c',
      `model_instructions_file=${JSON.stringify(normalizePathForConfig(instructionsPath))}`,
      '-o',
      outputLastMessagePath,
      '-',
    ],
    { cwd: projectRootPath, env },
  )

  const runState = {
    child,
    folderPath: projectRootPath,
    outputLastMessagePath,
    resumeContext,
    cancelRequested: false,
    pollTimer: null,
  }
  activeRun = runState
  emitAnalysisEvent({ type: 'started', folderPath: projectRootPath, model: FIXED_MODEL, reasoningEffort: FIXED_REASONING })
  startProgressPolling(runState)

  child.stdout.on('data', (chunk) => emitAnalysisEvent({ type: 'log', stream: 'stdout', message: chunk.toString() }))
  child.stderr.on('data', (chunk) => emitAnalysisEvent({ type: 'log', stream: 'stderr', message: chunk.toString() }))

  child.on('error', async (error) => {
    stopProgressPolling(runState)
    if (!runState.cancelRequested) {
      emitAnalysisEvent({
        type: 'failed',
        folderPath: projectRootPath,
        code: null,
        error: error.message,
        finalMessage: await readTextIfExists(outputLastMessagePath),
      })
      await writeProgressFile(projectRootPath, { status: 'failed', message: 'Codex CLI 실행 중 오류가 발생했습니다.' })
    }
    activeRun = null
  })

  child.on('close', async (code) => {
    stopProgressPolling(runState)
    if (runState.cancelRequested) {
      activeRun = null
      return
    }

    const finalMessage = await readTextIfExists(outputLastMessagePath)
    if (code === 0) {
      try {
        const parsedReport = parseAnalysisBatchResponse(finalMessage, {
          model: FIXED_MODEL,
          reasoningEffort: FIXED_REASONING,
        })

        await writePendingAnalysesFromReport(projectRootPath, resumeContext, finalMessage, {
          model: FIXED_MODEL,
          reasoningEffort: FIXED_REASONING,
        })

        await writeProgressFile(projectRootPath, {
          status: 'completed',
          totalFiles: resumeContext.totalFiles,
          reusableFiles: resumeContext.reusableCount,
          completedFiles: resumeContext.pendingCount,
          pendingFiles: 0,
          percent: 100,
          currentFile: '',
          message: parsedReport.message || '분석이 완료되었습니다.',
        })
        emitAnalysisEvent({
          type: 'completed',
          folderPath: projectRootPath,
          code,
          finalMessage: parsedReport.message || finalMessage,
          analysis: await loadAnalysis(projectRootPath),
        })
      } catch (error) {
        await writeProgressFile(projectRootPath, { status: 'failed', message: '분석 결과를 불러오는 중 오류가 발생했습니다.' })
        emitAnalysisEvent({
          type: 'failed',
          folderPath: projectRootPath,
          code,
          error: sanitizeError(error),
          finalMessage,
        })
      }
    } else {
      await writeProgressFile(projectRootPath, { status: 'failed', message: 'Codex CLI가 비정상 종료되었습니다.' })
      emitAnalysisEvent({
        type: 'failed',
        folderPath: projectRootPath,
        code,
        error: 'Codex CLI가 비정상 종료되었습니다.',
        finalMessage,
      })
    }

    activeRun = null
  })

  child.stdin.end(buildPromptWithContext(projectRootPath, sourceFolderPath, resumeContext))
  return { ok: true }
}

async function cancelAnalysis() {
  if (!activeRun) {
    return { ok: false }
  }

  const { child, folderPath } = activeRun
  activeRun.cancelRequested = true
  stopProgressPolling(activeRun)

  if (isWindows()) {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true })
  } else {
    child.kill('SIGTERM')
  }

  await writeProgressFile(folderPath, { status: 'cancelled', message: '사용자가 분석을 취소했습니다.' })
  emitAnalysisEvent({ type: 'cancelled', folderPath })
  activeRun = null
  return { ok: true }
}

async function getEnvironmentStatus() {
  const settings = await loadSettings()
  const env = buildChildEnv(settings)
  const ffprobeCommand = getDerivedFfprobeCommand(settings.ffmpegCommand)
  const [codexVersion, codexLogin, ffmpegVersion, ffprobeVersion] = await Promise.all([
    runCommand(settings.codexCommand, ['--version'], env),
    runCommand(settings.codexCommand, ['login', 'status'], env),
    runCommand(settings.ffmpegCommand, ['-version'], env),
    runCommand(ffprobeCommand, ['-version'], env),
  ])

  return {
    platform: process.platform,
    model: FIXED_MODEL,
    reasoningEffort: FIXED_REASONING,
    instructionsPath: getAssetPath('instructions.md'),
    settings,
    checks: {
      codex: {
        command: settings.codexCommand,
        ok: codexVersion.ok,
        detail: codexVersion.ok ? (codexVersion.stdout || codexVersion.stderr).trim().split(/\r?\n/)[0] : codexVersion.error || codexVersion.stderr.trim() || 'Codex CLI를 찾지 못했습니다.',
      },
      chatgptLogin: {
        command: settings.codexCommand,
        ok: codexLogin.ok && /logged in/i.test(codexLogin.stdout + codexLogin.stderr),
        detail: (codexLogin.stdout || codexLogin.stderr).trim() || '로그인 상태를 확인하지 못했습니다.',
      },
      ffmpeg: {
        command: settings.ffmpegCommand,
        ok: ffmpegVersion.ok,
        detail: ffmpegVersion.ok ? (ffmpegVersion.stdout || ffmpegVersion.stderr).trim().split(/\r?\n/)[0] : ffmpegVersion.error || ffmpegVersion.stderr.trim() || 'ffmpeg를 찾지 못했습니다.',
      },
      ffprobe: {
        command: ffprobeCommand,
        ok: ffprobeVersion.ok,
        detail: ffprobeVersion.ok ? (ffprobeVersion.stdout || ffprobeVersion.stderr).trim().split(/\r?\n/)[0] : ffprobeVersion.error || ffprobeVersion.stderr.trim() || 'ffprobe를 찾지 못했습니다.',
      },
    },
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1520,
    height: 980,
    minWidth: 1280,
    minHeight: 800,
    backgroundColor: '#f3efe4',
    webPreferences: {
      preload: path.join(app.getAppPath(), 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape' && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false)
      event.preventDefault()
    }
  })

  mainWindow.webContents.on('did-finish-load', () => console.log('[electron] renderer finished load'))
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[electron] did-fail-load code=${errorCode} url=${validatedURL} message=${errorDescription}`)
  })
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${sourceId}:${line} ${message}`)
  })
  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error(`[electron] preload-error path=${preloadPath} message=${error}`)
  })

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  } else {
    mainWindow.loadURL('http://127.0.0.1:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(buildAppMenu())
  protocol.handle(LOCAL_ASSET_SCHEME, (request) => {
    const requestUrl = new URL(request.url)
    const filePath = requestUrl.searchParams.get('path')
    if (!filePath) {
      return new Response('Missing path', { status: 400 })
    }
    return net.fetch(pathToFileURL(filePath).toString(), { headers: request.headers, method: request.method })
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('settings:get', async () => loadSettings())
ipcMain.handle('settings:save', async (_event, patch) => saveSettings(patch))
ipcMain.handle('environment:get', async () => getEnvironmentStatus())
ipcMain.handle('dialog:pick-root-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.canceled || result.filePaths.length === 0 ? '' : result.filePaths[0]
})
ipcMain.handle('folders:scan', async (_event, rootPath) => (rootPath ? collectVideoFolders(rootPath) : []))
ipcMain.handle('analysis:load', async (_event, folderPath) => loadAnalysis(folderPath))
ipcMain.handle('analysis:load-progress', async (_event, folderPath) => loadAnalysisProgress(folderPath))
ipcMain.handle('analysis:start', async (_event, folderPath) => startAnalysis(folderPath))
ipcMain.handle('analysis:cancel', async () => cancelAnalysis())
ipcMain.handle('shell:show-item', async (_event, targetPath) => {
  shell.showItemInFolder(targetPath)
  return true
})
ipcMain.handle('shell:open-path', async (_event, targetPath) => shell.openPath(targetPath))
