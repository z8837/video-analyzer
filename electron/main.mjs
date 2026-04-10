import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, protocol, shell } from 'electron'
import { spawn } from 'node:child_process'
import { createReadStream, mkdirSync, promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Readable } from 'node:stream'
import {
  collectFolderTree,
  collectVideoFolders,
  fileExists,
  getAnalyzePaths,
  getFolderRelativePath,
  getProjectRootPath,
  getProjectRelativeVideoPath,
  isSameOrChildPath,
  listDirectVideoFiles,
  readJsonIfExists,
  readTextIfExists,
  toPosixPath,
  writeJson,
} from './library-data.mjs'
import {
  getCompletedPendingSources,
  getResumeContext,
  readLibraryEntries,
  readResolvedLibraryEntries,
  writePendingAnalysesFromReport,
  writeTaskFile,
} from './library-runtime.mjs'
import {
  readLatestRateLimits,
  startRateLimitsWatcher,
} from './codex-rate-limits.mjs'

const DEFAULT_MODEL = 'gpt-5.4'
const DEFAULT_REASONING = 'medium'
const DEFAULT_MAX_PARALLEL_ANALYSIS = 5
const DEFAULT_CONSECUTIVE_FAILURE_LIMIT = 5
const MAX_PARALLEL_LIMIT = 20
const MAX_FAILURE_LIMIT = 100
const ALLOWED_REASONING_EFFORTS = new Set(['minimal', 'low', 'medium', 'high'])
const ANALYSIS_CHANNEL = 'analysis:event'
const APP_CHANNEL = 'app:event'
const CODEX_RATE_LIMITS_CHANNEL = 'codex:rate-limits-update'
const LOCAL_ASSET_SCHEME = 'codex-media'
const DEFAULT_DRAG_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg=='

let mainWindow = null
let activeRun = null
let latestCodexRateLimits = null
let stopCodexRateLimitsWatcher = null

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

const LOCAL_ASSET_CONTENT_TYPES = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.ogv': 'video/ogg',
  '.ts': 'video/mp2t',
  '.mpg': 'video/mpeg',
  '.mpeg': 'video/mpeg',
  '.3gp': 'video/3gpp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
}

function getLocalAssetContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return LOCAL_ASSET_CONTENT_TYPES[ext] || 'application/octet-stream'
}

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
    codexModel: DEFAULT_MODEL,
    codexReasoningEffort: DEFAULT_REASONING,
    maxParallelAnalysis: DEFAULT_MAX_PARALLEL_ANALYSIS,
    consecutiveFailureLimit: DEFAULT_CONSECUTIVE_FAILURE_LIMIT,
  }
}

function resolveCodexModel(settings) {
  const value = (settings?.codexModel || '').trim()
  return value || DEFAULT_MODEL
}

function resolveCodexReasoning(settings) {
  const value = (settings?.codexReasoningEffort || '').trim()
  return ALLOWED_REASONING_EFFORTS.has(value) ? value : DEFAULT_REASONING
}

function resolveMaxParallel(settings) {
  const raw = Number(settings?.maxParallelAnalysis)
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_MAX_PARALLEL_ANALYSIS
  }
  return Math.min(MAX_PARALLEL_LIMIT, Math.max(1, Math.floor(raw)))
}

function resolveConsecutiveFailureLimit(settings) {
  const raw = Number(settings?.consecutiveFailureLimit)
  if (!Number.isFinite(raw) || raw < 0) {
    return DEFAULT_CONSECUTIVE_FAILURE_LIMIT
  }
  if (raw === 0) {
    return 0
  }
  return Math.min(MAX_FAILURE_LIMIT, Math.max(1, Math.floor(raw)))
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

async function loadSettings() {
  try {
    const raw = await fs.readFile(getSettingsPath(), 'utf8')
    return sanitizeSettings({ ...getDefaultSettings(), ...JSON.parse(raw) })
  } catch {
    return getDefaultSettings()
  }
}

function sanitizeSettings(settings) {
  return {
    ...settings,
    codexModel: resolveCodexModel(settings),
    codexReasoningEffort: resolveCodexReasoning(settings),
    maxParallelAnalysis: resolveMaxParallel(settings),
    consecutiveFailureLimit: resolveConsecutiveFailureLimit(settings),
  }
}

async function saveSettings(patch) {
  const merged = sanitizeSettings({ ...(await loadSettings()), ...patch })
  await fs.writeFile(getSettingsPath(), JSON.stringify(merged, null, 2), 'utf8')
  return merged
}

async function updateSettingsWithPatch(currentSettings, patch) {
  if (!patch || Object.keys(patch).length === 0) {
    return currentSettings
  }

  return saveSettings({ ...currentSettings, ...patch })
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

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

function getCommandLabel(key) {
  if (key === 'codexCommand') {
    return 'Codex'
  }

  if (key === 'ffmpegCommand') {
    return 'ffmpeg'
  }

  return key
}

function getCommonExecutableCandidates(command) {
  const commandName = path.basename(command)
  const homeDirectory = process.env.HOME || ''

  return [
    path.join('/opt/homebrew/bin', commandName),
    path.join('/usr/local/bin', commandName),
    homeDirectory ? path.join(homeDirectory, '.local', 'bin', commandName) : '',
    homeDirectory ? path.join(homeDirectory, '.npm-global', 'bin', commandName) : '',
  ].filter(Boolean)
}

async function resolveExecutablePath(command, env) {
  if (!command) {
    return ''
  }

  if (path.isAbsolute(command)) {
    return (await fileExists(command)) ? command : ''
  }

  if (isWindows()) {
    const resolved = await runCommand('where', [command], env)
    if (!resolved.ok) {
      return ''
    }

    return (resolved.stdout || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || ''
  }

  const resolved = await runCommand('/bin/sh', ['-lc', `command -v ${shellEscape(command)}`], env)
  if (resolved.ok) {
    const firstLine = (resolved.stdout || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean)

    if (firstLine) {
      return firstLine
    }
  }

  for (const candidate of getCommonExecutableCandidates(command)) {
    if (await fileExists(candidate)) {
      return candidate
    }
  }

  return ''
}

function summarizeCommandFailure(result, fallbackMessage) {
  return (
    result.error ||
    result.stderr
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ||
    result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ||
    fallbackMessage
  )
}

async function resolveToolCommandSettings(currentSettings, actions = []) {
  let settings = currentSettings

  for (const [key, fallbackCommand] of [
    ['codexCommand', isWindows() ? 'codex.cmd' : 'codex'],
    ['ffmpegCommand', isWindows() ? 'ffmpeg.exe' : 'ffmpeg'],
  ]) {
    const currentCommand = settings[key]
    const resolvedCommand = await resolveExecutablePath(
      currentCommand || fallbackCommand,
      buildChildEnv(settings),
    )

    if (!resolvedCommand || resolvedCommand === currentCommand) {
      continue
    }

    settings = await updateSettingsWithPatch(settings, { [key]: resolvedCommand })
    actions.push(`${getCommandLabel(key)} 실행 파일을 ${resolvedCommand}로 설정했습니다.`)
  }

  return settings
}

async function resolveHomebrewCommand(env) {
  for (const candidate of ['/opt/homebrew/bin/brew', '/usr/local/bin/brew', 'brew']) {
    const resolved = await resolveExecutablePath(candidate, env)
    if (resolved) {
      return resolved
    }
  }

  return ''
}

async function getHomebrewPrefix(brewCommand, env) {
  const result = await runCommand(brewCommand, ['--prefix'], env)
  return result.ok ? result.stdout.trim() : ''
}

async function installCodexIfNeeded(currentSettings, actions = [], issues = []) {
  let settings = currentSettings
  const initialEnvironment = await getEnvironmentStatus(settings)
  if (initialEnvironment.checks.codex.ok) {
    return { settings, environment: initialEnvironment }
  }

  if (process.platform !== 'darwin') {
    issues.push('이 운영체제에서는 Codex 자동 설치를 지원하지 않습니다. Codex CLI를 직접 설치해 주세요.')
    return { settings, environment: initialEnvironment }
  }

  const env = buildChildEnv(settings)
  const brewCommand = await resolveHomebrewCommand(env)
  if (!brewCommand) {
    issues.push('Homebrew를 찾지 못해 Codex를 자동 설치하지 못했습니다. Homebrew 설치 후 다시 시도해 주세요.')
    return { settings, environment: initialEnvironment }
  }

  actions.push('Codex CLI가 없어 Homebrew로 자동 설치를 시도합니다.')
  const installResult = await runCommand(brewCommand, ['install', '--cask', 'codex'], env)
  if (!installResult.ok) {
    issues.push(
      `Codex 자동 설치에 실패했습니다. ${summarizeCommandFailure(installResult, 'brew install --cask codex가 실패했습니다.')}`,
    )
    return { settings, environment: initialEnvironment }
  }

  const resolvedCodexPath = await resolveExecutablePath('codex', buildChildEnv(settings))
  if (resolvedCodexPath && resolvedCodexPath !== settings.codexCommand) {
    settings = await updateSettingsWithPatch(settings, { codexCommand: resolvedCodexPath })
    actions.push(`Codex CLI를 설치하고 ${resolvedCodexPath}로 설정했습니다.`)
  } else {
    actions.push('Codex CLI 설치를 완료했습니다.')
  }

  return { settings, environment: await getEnvironmentStatus(settings) }
}

async function installFfmpegIfNeeded(currentSettings, actions = [], issues = []) {
  let settings = currentSettings
  const initialEnvironment = await getEnvironmentStatus(settings)
  if (initialEnvironment.checks.ffmpeg.ok && initialEnvironment.checks.ffprobe.ok) {
    return { settings, environment: initialEnvironment }
  }

  if (process.platform !== 'darwin') {
    issues.push('이 운영체제에서는 ffmpeg 자동 설치를 지원하지 않습니다. ffmpeg와 ffprobe를 직접 설치해 주세요.')
    return { settings, environment: initialEnvironment }
  }

  const env = buildChildEnv(settings)
  const brewCommand = await resolveHomebrewCommand(env)
  if (!brewCommand) {
    issues.push('Homebrew를 찾지 못해 ffmpeg를 자동 설치하지 못했습니다. Homebrew 설치 후 다시 시도해 주세요.')
    return { settings, environment: initialEnvironment }
  }

  actions.push('ffmpeg가 없어 Homebrew로 자동 설치를 시도합니다.')
  const installResult = await runCommand(brewCommand, ['install', 'ffmpeg'], env)
  if (!installResult.ok) {
    issues.push(`ffmpeg 자동 설치에 실패했습니다. ${summarizeCommandFailure(installResult, 'brew install ffmpeg가 실패했습니다.')}`)
    return { settings, environment: initialEnvironment }
  }

  const brewPrefix = await getHomebrewPrefix(brewCommand, env)
  const preferredFfmpegPath = brewPrefix ? path.join(brewPrefix, 'bin', 'ffmpeg') : ''
  const resolvedFfmpegPath =
    (preferredFfmpegPath && (await fileExists(preferredFfmpegPath)) && preferredFfmpegPath) ||
    (await resolveExecutablePath('ffmpeg', {
      ...env,
      PATH: [brewPrefix ? path.join(brewPrefix, 'bin') : '', env.PATH || '']
        .filter(Boolean)
        .join(path.delimiter),
    }))

  if (resolvedFfmpegPath && resolvedFfmpegPath !== settings.ffmpegCommand) {
    settings = await updateSettingsWithPatch(settings, { ffmpegCommand: resolvedFfmpegPath })
    actions.push(`ffmpeg를 설치하고 ${resolvedFfmpegPath}로 설정했습니다.`)
  } else {
    actions.push('ffmpeg 설치를 완료했습니다.')
  }

  return { settings, environment: await getEnvironmentStatus(settings) }
}

function collectEnvironmentIssues(environment, initialIssues = []) {
  const issues = [...initialIssues]

  if (!environment.checks.codex.ok) {
    issues.push(`Codex CLI 확인 필요: ${environment.checks.codex.detail}`)
  }

  if (
    !environment.checks.chatgptLogin.ok &&
    !issues.some((issue) => issue.startsWith('Codex 로그인'))
  ) {
    issues.push('Codex 로그인 필요: 저장 및 점검을 눌러 로그인 창을 연 뒤 다시 점검해 주세요.')
  }

  if (!environment.checks.ffmpeg.ok) {
    issues.push(`ffmpeg 확인 필요: ${environment.checks.ffmpeg.detail}`)
  }

  if (!environment.checks.ffprobe.ok) {
    issues.push(`ffprobe 확인 필요: ${environment.checks.ffprobe.detail}`)
  }

  return [...new Set(issues)]
}

function isEnvironmentReady(environment) {
  return (
    environment.checks.codex.ok &&
    environment.checks.chatgptLogin.ok &&
    environment.checks.ffmpeg.ok &&
    environment.checks.ffprobe.ok
  )
}

function buildPreparationMessage(actions, issues, environment) {
  if (isEnvironmentReady(environment)) {
    return actions.length > 0
      ? `${actions[actions.length - 1]} 도구 준비를 완료했습니다.`
      : '도구 준비를 완료했습니다.'
  }

  if (actions.length > 0) {
    return `${actions[actions.length - 1]} 아직 해결이 필요한 항목이 있습니다.`
  }

  if (issues.length > 0) {
    return '자동 준비를 마쳤지만 수동 확인이 필요한 항목이 남아 있습니다.'
  }

  return '도구 상태를 다시 점검했습니다.'
}

async function prepareEnvironment(patch = {}) {
  const actions = []
  const installIssues = []

  let settings = await saveSettings(patch)
  settings = await resolveToolCommandSettings(settings, actions)

  const codexPrepared = await installCodexIfNeeded(settings, actions, installIssues)
  settings = await resolveToolCommandSettings(codexPrepared.settings, actions)

  const ffmpegPrepared = await installFfmpegIfNeeded(settings, actions, installIssues)
  settings = await resolveToolCommandSettings(ffmpegPrepared.settings, actions)

  let environment = await getEnvironmentStatus(settings)
  if (environment.checks.codex.ok && !environment.checks.chatgptLogin.ok) {
    const { opened, issue } = await openCodexLoginWindow(settings)
    if (opened) {
      actions.push('Codex 로그인 창을 열었습니다.')
      installIssues.push('Codex 로그인 창을 열었습니다. 로그인 완료 후 다시 저장 및 점검해 주세요.')
    } else if (issue) {
      installIssues.push(`Codex 로그인 창을 열지 못했습니다. ${issue}`)
    }

    environment = await getEnvironmentStatus(settings)
  }

  const issues = collectEnvironmentIssues(environment, installIssues)

  return {
    settings,
    environment,
    actions,
    issues,
    message: buildPreparationMessage(actions, issues, environment),
  }
}

function escapeAppleScriptString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function buildCodexLoginCommand(settings) {
  const env = buildChildEnv(settings)
  const prefix = env.PATH ? `env PATH=${shellEscape(env.PATH)} ` : ''
  return `${prefix}${shellEscape(settings.codexCommand)} login`
}

async function openCodexLoginWindow(settings) {
  if (process.platform !== 'darwin') {
    return {
      opened: false,
      issue: '이 운영체제에서는 로그인 창 자동 열기를 지원하지 않습니다. 터미널에서 codex login을 실행해 주세요.',
    }
  }

  const loginCommand = buildCodexLoginCommand(settings)
  const script = [
    'tell application "Terminal"',
    '  activate',
    `  do script "${escapeAppleScriptString(loginCommand)}"`,
    'end tell',
  ].join('\n')
  const result = await runCommand('/usr/bin/osascript', ['-e', script], buildChildEnv(settings))

  return result.ok
    ? { opened: true, issue: '' }
    : {
        opened: false,
        issue: summarizeCommandFailure(
          result,
          'Terminal에서 codex login 창을 여는 데 실패했습니다.',
        ),
      }
}

function buildFileUrl(filePath, cacheKey = '') {
  const url = new URL(`${LOCAL_ASSET_SCHEME}://local/`)
  url.searchParams.set('path', filePath)
  if (cacheKey) {
    url.searchParams.set('v', cacheKey)
  }
  return url.href
}

function resolveDragIcon(preferredPath = '') {
  const candidatePaths = [
    preferredPath,
    app.isPackaged
      ? path.join(app.getAppPath(), 'dist', 'favicon.svg')
      : path.join(app.getAppPath(), 'public', 'favicon.svg'),
    path.join(app.getAppPath(), 'src', 'assets', 'hero.png'),
  ].filter(Boolean)

  for (const candidatePath of candidatePaths) {
    const icon = nativeImage.createFromPath(candidatePath)
    if (!icon.isEmpty()) {
      return icon.resize({ width: 64, height: 64 })
    }
  }

  return nativeImage.createFromDataURL(DEFAULT_DRAG_ICON_DATA_URL).resize({ width: 64, height: 64 })
}

function resolveSampleImagePath(analyzeDir, sampleImage) {
  if (!sampleImage) {
    return ''
  }

  return path.isAbsolute(sampleImage)
    ? sampleImage
    : path.join(analyzeDir, sampleImage)
}

async function buildMediaAssetInfo(absoluteVideoPath, sampleImagePath = '') {
  let videoUrl = buildFileUrl(absoluteVideoPath)
  let resolvedSampleImagePath = ''
  let sampleImageUrl = ''

  try {
    const videoStat = await fs.stat(absoluteVideoPath)
    videoUrl = buildFileUrl(absoluteVideoPath, String(Math.floor(videoStat.mtimeMs)))
  } catch {
    // Keep a bare URL if the source video is currently missing.
  }

  if (sampleImagePath && (await fileExists(sampleImagePath))) {
    const sampleStat = await fs.stat(sampleImagePath)
    resolvedSampleImagePath = sampleImagePath
    sampleImageUrl = buildFileUrl(sampleImagePath, String(Math.floor(sampleStat.mtimeMs)))
  }

  return {
    videoUrl,
    sampleImagePath: resolvedSampleImagePath,
    sampleImageUrl,
  }
}

async function buildAnalysisVideo(projectRootPath, analyzeDir, entry) {
  const absoluteVideoPath = path.join(projectRootPath, entry.record.source)
  const { videoUrl, sampleImagePath, sampleImageUrl } = await buildMediaAssetInfo(
    absoluteVideoPath,
    resolveSampleImagePath(analyzeDir, entry.record.sampleImage),
  )

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
    keywordMoments: entry.record.keywordMoments || [],
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
    model: entry.record.model || DEFAULT_MODEL,
    reasoningEffort: entry.record.reasoningEffort || DEFAULT_REASONING,
  }
}

async function loadFolderTree(projectRootPath) {
  if (!projectRootPath) {
    return null
  }

  return collectFolderTree(projectRootPath)
}

async function loadFolderVideos(projectRootPath, folderPath) {
  if (!projectRootPath || !folderPath) {
    return []
  }

  const { analyzeDir } = getAnalyzePaths(projectRootPath)
  const { entries } = await readResolvedLibraryEntries(projectRootPath)
  const analysisBySource = new Map(entries.map((entry) => [entry.record.source, entry]))
  const folderRelativePath = getFolderRelativePath(projectRootPath, folderPath)
  const directVideoFiles = await listDirectVideoFiles(folderPath)

  return Promise.all(
    directVideoFiles.map(async (fileName) => {
      const source = getProjectRelativeVideoPath(projectRootPath, folderPath, fileName)
      const absolutePath = path.join(folderPath, fileName)
      const entry = analysisBySource.get(source)
      const { videoUrl, sampleImagePath, sampleImageUrl } = await buildMediaAssetInfo(
        absolutePath,
        entry ? resolveSampleImagePath(analyzeDir, entry.record.sampleImage) : '',
      )

      return {
        fileName,
        source,
        relativePath: source,
        folderRelativePath,
        absolutePath,
        videoUrl,
        sampleImagePath,
        sampleImageUrl,
        analyzed: Boolean(entry),
        title: entry?.record.title || fileName,
        summary: entry?.record.summary || '',
        generatedAt: entry?.record.generatedAt || '',
        durationSeconds: entry?.record.durationSeconds ?? undefined,
        width: entry?.record.width ?? undefined,
        height: entry?.record.height ?? undefined,
        fps: entry?.record.fps ?? undefined,
        hasAudio: entry?.record.hasAudio ?? undefined,
        analysisFilePath: entry?.markdownPath || '',
      }
    }),
  )
}

async function loadAnalysis(projectRootPath) {
  if (!projectRootPath) {
    return { exists: false, folderPath: '', directVideoCount: 0, videos: [] }
  }

  const { analyzeDir } = getAnalyzePaths(projectRootPath)
  const { entries, generatedAt } = await readResolvedLibraryEntries(projectRootPath)
  const videos = await Promise.all(
    entries.map((entry) => buildAnalysisVideo(projectRootPath, analyzeDir, entry)),
  )

  return {
    exists: videos.length > 0,
    folderPath: projectRootPath,
    directVideoCount: videos.length,
    generatedAt,
    model: DEFAULT_MODEL,
    reasoningEffort: DEFAULT_REASONING,
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
      ? Math.round((completedFiles / activeWorkTotal) * 100)
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

function emitCodexRateLimits(snapshot) {
  latestCodexRateLimits = snapshot
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(CODEX_RATE_LIMITS_CHANNEL, snapshot)
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

function buildPromptWithContext(projectRootPath, sourceFolderPath, resumeContext, taskFilePath) {
  return [
    `The current working directory is "${projectRootPath}".`,
    `The selected source folder is "${sourceFolderPath}".`,
    `The selected source folder relative to the project root is "${resumeContext.folderRelativePath}".`,
    `Read "${taskFilePath}" and analyze only the pending videos listed there for this worker.`,
    `Reuse count for this run: ${resumeContext.reusableCount}. Pending new analyses: ${resumeContext.pendingCount}.`,
    'Do not inspect unrelated repository files or scan the whole project.',
    'Do not create or update any markdown files yourself.',
    'Do not create or update analyze/results.json, analyze/index.md, preview videos, or permanent sample-sheet images.',
    'Each pending video in the task file has a pre-extracted "metadata" object with durationSeconds, width, height, fps, hasAudio. Use it directly instead of running ffprobe.',
    'Each pending video may also include sampleTimesSeconds. Use those timeline points when you extract representative frames.',
    'Keep the workflow short: extract a few representative frames with ffmpeg if needed, then describe what you see.',
    'On Windows, never embed Korean literals inside PowerShell command strings or here-strings.',
    'Keep Korean text only in your final response JSON. The desktop app will write the UTF-8 markdown files for you.',
    'Your final response must be exactly one JSON object and nothing else.',
    'Use this shape: {"schemaVersion":1,"message":"짧은 한국어 완료 문장","analyses":[...]}',
    'Include keywordMoments with approximate seconds for each keyword so the desktop app can jump the player to that scene.',
    'keywordMoments must be useful jump anchors, not just default 0-second tags.',
    'For clips longer than 3 seconds, do not set multiple keywordMoments to 0 unless the scene truly stays unchanged and no better anchor exists.',
    'If an object is visible for the whole clip, prefer the first clearly readable moment after the opening instant, usually around 0.8 to 1.5 seconds for longer clips.',
    'Prefer keywords tied to distinct scene elements or moments that help the user jump to a meaningful point in the timeline.',
    'Each analyses item must contain source, fileName, title, summary, details, categories, keywords, keywordMoments, durationSeconds, width, height, fps, hasAudio, sampleImage, generatedAt, model, reasoningEffort.',
    'The analyses array must contain one item for every pending video from the task file and source must exactly match the task file.',
    'Copy source exactly from the task JSON; do not translate, normalize, re-encode, or reconstruct Korean folder/file names.',
  ].join('\n')
}

function createWorkerResumeContext(resumeContext, pendingVideo) {
  return {
    ...resumeContext,
    generatedAt: new Date().toISOString(),
    pendingCount: 1,
    pendingVideos: [pendingVideo],
  }
}

function buildWorkerTaskPayload(projectRootPath, sourceFolderPath, resumeContext, pendingVideo) {
  const workerContext = createWorkerResumeContext(resumeContext, pendingVideo)

  return {
    schemaVersion: 1,
    generatedAt: workerContext.generatedAt,
    projectRootPath,
    sourceFolderPath,
    sourceFolderRelativePath: workerContext.folderRelativePath,
    totalFiles: workerContext.totalFiles,
    reusableCount: workerContext.reusableCount,
    pendingCount: workerContext.pendingCount,
    pendingVideos: workerContext.pendingVideos,
  }
}

function buildWorkerPrefix(workerState) {
  return `[worker ${workerState.workerIndex}] ${workerState.pendingVideo.source}`
}

function prefixLogMessage(prefix, message) {
  return message
    .split(/\r?\n/)
    .map((line) => (line ? `${prefix} ${line}` : ''))
    .join('\n')
}

function createRunDirectoryName(resumeContext) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const folderSegment =
    resumeContext.folderRelativePath === '.'
      ? 'root'
      : resumeContext.folderRelativePath
          .replace(/[\\/]+/g, '__')
          .replace(/[^a-zA-Z0-9._-]/g, '_')

  return `${timestamp}-${folderSegment}`
}

function enqueueFileWrite(owner, key, filePath, contents) {
  owner[key] = (owner[key] || Promise.resolve())
    .then(() => fs.appendFile(filePath, contents, 'utf8'))
    .catch(() => {
      // Ignore log persistence failures and keep the run alive.
    })

  return owner[key]
}

function getRelativeLogPath(runState, filePath) {
  return toPosixPath(path.relative(runState.runDirPath, filePath))
}

function createWorkerFileBase(workerIndex) {
  return `worker-${String(workerIndex).padStart(2, '0')}`
}

function appendRunEventLog(runState, stream, message) {
  const lines = String(message || '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)

  if (lines.length === 0) {
    return Promise.resolve()
  }

  const timestamp = new Date().toISOString()
  const payload = `${lines
    .map((line) => `[${timestamp}] [${stream}] ${line}`)
    .join('\n')}\n`

  return enqueueFileWrite(runState, 'eventLogQueue', runState.eventsLogPath, payload)
}

function appendWorkerStreamLog(workerState, stream, message) {
  const text = String(message || '')
  if (!text) {
    return Promise.resolve()
  }

  const suffix = text.endsWith('\n') ? '' : '\n'
  const filePath = stream === 'stderr' ? workerState.stderrLogPath : workerState.stdoutLogPath
  return enqueueFileWrite(workerState, 'streamLogQueue', filePath, `${text}${suffix}`)
}

function buildRunSummary(runState, overrides = {}) {
  const startedAt = overrides.startedAt ?? runState.startedAt
  const endedAt = overrides.endedAt ?? runState.endedAt ?? ''
  const status = overrides.status ?? runState.status ?? 'running'
  const completedFiles = overrides.completedFiles ?? runState.completedFiles ?? 0
  const pendingFiles =
    overrides.pendingFiles ??
    runState.pendingFiles ??
    Math.max(runState.resumeContext.pendingCount - completedFiles, 0)
  const currentFile = overrides.currentFile ?? runState.currentFile ?? ''
  const finalMessage = overrides.finalMessage ?? runState.finalMessage ?? ''
  const failures = (overrides.failures ?? runState.failures ?? []).map((failure) => ({
    workerIndex: failure.workerIndex,
    source: failure.source,
    error: failure.error,
    finalMessage: failure.finalMessage || '',
  }))

  return {
    schemaVersion: 1,
    runId: runState.runId,
    startedAt,
    endedAt,
    status,
    folderPath: runState.folderPath,
    sourceFolderPath: runState.sourceFolderPath,
    folderRelativePath: runState.resumeContext.folderRelativePath,
    totalFiles: runState.resumeContext.totalFiles,
    reusableCount: runState.resumeContext.reusableCount,
    pendingCount: runState.resumeContext.pendingCount,
    completedFiles,
    pendingFiles,
    maxParallel: runState.maxParallel,
    currentFile,
    finalMessage,
    settings: {
      codexCommand: runState.settings.codexCommand,
      ffmpegCommand: runState.settings.ffmpegCommand,
    },
    files: {
      eventsLog: getRelativeLogPath(runState, runState.eventsLogPath),
      taskSnapshot: getRelativeLogPath(runState, runState.taskSnapshotPath),
    },
    workers: runState.workerRecords.map((worker) => ({
      workerIndex: worker.workerIndex,
      source: worker.source,
      taskFile: getRelativeLogPath(runState, worker.taskFilePath),
      stdoutLog: getRelativeLogPath(runState, worker.stdoutLogPath),
      stderrLog: getRelativeLogPath(runState, worker.stderrLogPath),
      lastMessageFile: getRelativeLogPath(runState, worker.outputLastMessagePath),
    })),
    failures,
  }
}

async function writeRunSummary(runState, overrides = {}) {
  const nextSummary = buildRunSummary(runState, overrides)

  runState.status = nextSummary.status
  runState.completedFiles = nextSummary.completedFiles
  runState.pendingFiles = nextSummary.pendingFiles
  runState.currentFile = nextSummary.currentFile
  runState.finalMessage = nextSummary.finalMessage
  runState.endedAt = nextSummary.endedAt

  await writeJson(runState.summaryPath, nextSummary)
}

async function initializeRunArtifacts(
  projectRootPath,
  sourceFolderPath,
  resumeContext,
  settings,
  maxParallel,
) {
  const runId = createRunDirectoryName(resumeContext)
  const { runsDir } = getAnalyzePaths(projectRootPath)
  const runDirPath = path.join(runsDir, runId)

  await fs.mkdir(runDirPath, { recursive: true })

  const taskSnapshotPath = path.join(runDirPath, 'task.json')
  await writeJson(taskSnapshotPath, {
    schemaVersion: 1,
    generatedAt: resumeContext.generatedAt,
    projectRootPath,
    sourceFolderPath,
    sourceFolderRelativePath: resumeContext.folderRelativePath,
    totalFiles: resumeContext.totalFiles,
    reusableCount: resumeContext.reusableCount,
    pendingCount: resumeContext.pendingCount,
    pendingVideos: resumeContext.pendingVideos,
  })

  const runState = {
    folderPath: projectRootPath,
    sourceFolderPath,
    resumeContext,
    settings,
    env: buildChildEnv(settings),
    instructionsPath: getAssetPath('instructions.md'),
    codexModel: resolveCodexModel(settings),
    codexReasoning: resolveCodexReasoning(settings),
    consecutiveFailureLimit: resolveConsecutiveFailureLimit(settings),
    consecutiveFailures: 0,
    autoStopRequested: false,
    runId,
    runDirPath,
    taskSnapshotPath,
    eventsLogPath: path.join(runDirPath, 'events.log'),
    summaryPath: path.join(runDirPath, 'run.json'),
    startedAt: new Date().toISOString(),
    endedAt: '',
    status: 'running',
    completedFiles: 0,
    pendingFiles: resumeContext.pendingCount,
    currentFile: resumeContext.pendingVideos[0]?.source || '',
    finalMessage: '',
    maxParallel,
    pendingQueue: [...resumeContext.pendingVideos],
    workers: new Map(),
    workerRecords: [],
    failures: [],
    nextWorkerIndex: 1,
    cancelRequested: false,
    pollTimer: null,
    pumping: false,
    needsPump: false,
    finishing: false,
    eventLogQueue: Promise.resolve(),
  }

  await writeRunSummary(runState, { status: 'running' })
  return runState
}

async function cleanupWorkerArtifacts(workerState) {
  await workerState.streamLogQueue
}

async function finalizeAnalysisRun(runState) {
  if (runState.finishing) {
    return
  }

  runState.finishing = true

  try {
    stopProgressPolling(runState)

    if (runState.cancelRequested) {
      return
    }

    const completedSources = await getCompletedPendingSources(
      runState.folderPath,
      runState.resumeContext.pendingVideos,
    )
    const completedFiles = completedSources.size
    const pendingFiles = Math.max(runState.resumeContext.pendingCount - completedFiles, 0)

    if (runState.failures.length === 0) {
      const finalMessage =
        runState.resumeContext.pendingCount === 1
          ? '새로 1개 영상을 분석했습니다.'
          : `새로 ${runState.resumeContext.pendingCount}개 영상을 분석했습니다.`
      const endedAt = new Date().toISOString()

      await writeProgressFile(runState.folderPath, {
        status: 'completed',
        totalFiles: runState.resumeContext.totalFiles,
        reusableFiles: runState.resumeContext.reusableCount,
        completedFiles,
        pendingFiles: 0,
        percent: 100,
        currentFile: '',
        message: finalMessage,
      })
      await appendRunEventLog(runState, 'stdout', finalMessage)
      await writeRunSummary(runState, {
        status: 'completed',
        completedFiles,
        pendingFiles: 0,
        currentFile: '',
        finalMessage,
        endedAt,
      })
      emitAnalysisEvent({
        type: 'completed',
        folderPath: runState.folderPath,
        code: 0,
        finalMessage,
        analysis: await loadAnalysis(runState.folderPath),
      })
      return
    }

    const error = runState.failures
      .map((failure) => `[worker ${failure.workerIndex}] ${failure.source}: ${failure.error}`)
      .join('\n')
    const finalMessage = runState.failures
      .map((failure) => failure.finalMessage)
      .filter(Boolean)
      .join('\n\n')
    const endedAt = new Date().toISOString()

    await writeProgressFile(runState.folderPath, {
      status: 'failed',
      totalFiles: runState.resumeContext.totalFiles,
      reusableFiles: runState.resumeContext.reusableCount,
      completedFiles,
      pendingFiles,
      currentFile: '',
      message:
        pendingFiles > 0
          ? `${pendingFiles}개 파일을 남기고 일부 병렬 작업이 실패했습니다.`
          : '일부 병렬 작업이 실패했습니다.',
    })
    await appendRunEventLog(runState, 'stderr', error || '일부 분석 작업이 실패했습니다.')
    await writeRunSummary(runState, {
      status: 'failed',
      completedFiles,
      pendingFiles,
      currentFile: '',
      finalMessage,
      endedAt,
    })
    emitAnalysisEvent({
      type: 'failed',
      folderPath: runState.folderPath,
      code: 1,
      error: error || '일부 분석 작업이 실패했습니다.',
      finalMessage,
    })
  } finally {
    if (activeRun === runState) {
      activeRun = null
    }
  }
}

function killRunningWorkers(runState) {
  for (const workerState of runState.workers.values()) {
    if (!workerState.child?.pid || workerState.closed) {
      continue
    }

    try {
      if (isWindows()) {
        spawn('taskkill', ['/pid', String(workerState.child.pid), '/t', '/f'], { windowsHide: true })
      } else {
        workerState.child.kill('SIGTERM')
      }
    } catch {
      // Ignore kill errors; worker close handler will still fire.
    }
  }
}

async function triggerAutoStop(runState, reason) {
  if (runState.autoStopRequested) {
    return
  }

  runState.autoStopRequested = true
  runState.pendingQueue.length = 0

  emitAnalysisEvent({
    type: 'log',
    stream: 'stderr',
    message: reason,
  })
  await appendRunEventLog(runState, 'stderr', reason)

  killRunningWorkers(runState)
}

async function handleWorkerClose(runState, workerState, code) {
  if (workerState.closed) {
    return
  }

  workerState.closed = true
  runState.workers.delete(workerState.workerIndex)

  const finalMessage = await readTextIfExists(workerState.outputLastMessagePath)
  let workerFailed = false

  if (!runState.cancelRequested) {
    if (code === 0 && !workerState.spawnError) {
      try {
        const workerContext = createWorkerResumeContext(
          runState.resumeContext,
          workerState.pendingVideo,
        )

        await writePendingAnalysesFromReport(runState.folderPath, workerContext, finalMessage, {
          model: runState.codexModel,
          reasoningEffort: runState.codexReasoning,
        })
        emitAnalysisEvent({
          type: 'log',
          stream: 'stdout',
          message: `${buildWorkerPrefix(workerState)} 완료`,
        })
        await appendRunEventLog(runState, 'stdout', `${buildWorkerPrefix(workerState)} 완료`)
      } catch (error) {
        workerFailed = true
        runState.failures.push({
          workerIndex: workerState.workerIndex,
          source: workerState.pendingVideo.source,
          error: sanitizeError(error),
          finalMessage,
        })
      }
    } else {
      workerFailed = true
      runState.failures.push({
        workerIndex: workerState.workerIndex,
        source: workerState.pendingVideo.source,
        error:
          workerState.spawnError ||
          `Codex CLI가 비정상 종료되었습니다${code == null ? '' : ` (code ${code})`}.`,
        finalMessage,
      })
    }

    if (workerFailed) {
      runState.consecutiveFailures += 1
    } else {
      runState.consecutiveFailures = 0
    }

    if (
      !runState.autoStopRequested &&
      runState.consecutiveFailureLimit > 0 &&
      runState.consecutiveFailures >= runState.consecutiveFailureLimit
    ) {
      const reason =
        `연속 ${runState.consecutiveFailures}개 작업이 실패하여 나머지 분석을 자동으로 중단합니다. ` +
        `(한도: ${runState.consecutiveFailureLimit}, 사용량 한도 초과 또는 환경 문제일 수 있습니다.)`
      await triggerAutoStop(runState, reason)
    }
  }

  await cleanupWorkerArtifacts(workerState)

  if (runState.cancelRequested) {
    return
  }

  try {
    await refreshActiveRunProgress(runState)
  } catch {
    // Ignore transient progress update errors after worker completion.
  }

  await pumpAnalysisQueue(runState)
}

async function launchAnalysisWorker(runState, workerState) {
  const workerContext = createWorkerResumeContext(runState.resumeContext, workerState.pendingVideo)

  await writeJson(
    workerState.taskFilePath,
    buildWorkerTaskPayload(
      runState.folderPath,
      runState.sourceFolderPath,
      runState.resumeContext,
      workerState.pendingVideo,
    ),
  )

  const child = spawnCommand(
    runState.settings.codexCommand,
    [
      'exec',
      '--full-auto',
      '--skip-git-repo-check',
      '--ephemeral',
      '--color',
      'never',
      '-C',
      runState.folderPath,
      '-m',
      runState.codexModel,
      '-c',
      `model_reasoning_effort=${JSON.stringify(runState.codexReasoning)}`,
      '-c',
      `model_instructions_file=${JSON.stringify(normalizePathForConfig(runState.instructionsPath))}`,
      '-o',
      workerState.outputLastMessagePath,
      '-',
    ],
    { cwd: runState.folderPath, env: runState.env },
  )

  workerState.child = child
  runState.workers.set(workerState.workerIndex, workerState)
  runState.workerRecords.push({
    workerIndex: workerState.workerIndex,
    source: workerState.pendingVideo.source,
    taskFilePath: workerState.taskFilePath,
    stdoutLogPath: workerState.stdoutLogPath,
    stderrLogPath: workerState.stderrLogPath,
    outputLastMessagePath: workerState.outputLastMessagePath,
  })

  emitAnalysisEvent({
    type: 'log',
    stream: 'stdout',
    message: `${buildWorkerPrefix(workerState)} 시작`,
  })
  void appendRunEventLog(runState, 'stdout', `${buildWorkerPrefix(workerState)} 시작`)

  child.stdout.on('data', (chunk) => {
    const rawMessage = chunk.toString()
    const displayMessage = prefixLogMessage(buildWorkerPrefix(workerState), rawMessage.trimEnd())

    if (displayMessage) {
      emitAnalysisEvent({
        type: 'log',
        stream: 'stdout',
        message: displayMessage,
      })
      void appendRunEventLog(runState, 'stdout', displayMessage)
    }

    void appendWorkerStreamLog(workerState, 'stdout', rawMessage)
  })
  child.stderr.on('data', (chunk) => {
    const rawMessage = chunk.toString()
    const displayMessage = prefixLogMessage(buildWorkerPrefix(workerState), rawMessage.trimEnd())

    if (displayMessage) {
      emitAnalysisEvent({
        type: 'log',
        stream: 'stderr',
        message: displayMessage,
      })
      void appendRunEventLog(runState, 'stderr', displayMessage)
    }

    void appendWorkerStreamLog(workerState, 'stderr', rawMessage)
  })
  child.on('error', (error) => {
    workerState.spawnError = error.message
  })
  child.on('close', (code) => {
    void handleWorkerClose(runState, workerState, code)
  })

  child.stdin.end(
    buildPromptWithContext(
      runState.folderPath,
      runState.sourceFolderPath,
      workerContext,
      workerState.taskFilePath,
    ),
  )
}

async function pumpAnalysisQueue(runState) {
  if (runState.pumping) {
    runState.needsPump = true
    return
  }

  runState.pumping = true

  try {
    do {
      runState.needsPump = false

      if (activeRun !== runState || runState.cancelRequested) {
        return
      }

      while (
        runState.workers.size < runState.maxParallel &&
        runState.pendingQueue.length > 0 &&
        !runState.cancelRequested
      ) {
        const pendingVideo = runState.pendingQueue.shift()
        const workerIndex = runState.nextWorkerIndex++
        const workerFileBase = createWorkerFileBase(workerIndex)
        const workerState = {
          workerIndex,
          pendingVideo,
          taskFilePath: path.join(runState.runDirPath, `${workerFileBase}.task.json`),
          outputLastMessagePath: path.join(runState.runDirPath, `${workerFileBase}.last-message.txt`),
          stdoutLogPath: path.join(runState.runDirPath, `${workerFileBase}.stdout.log`),
          stderrLogPath: path.join(runState.runDirPath, `${workerFileBase}.stderr.log`),
          child: null,
          spawnError: '',
          closed: false,
          streamLogQueue: Promise.resolve(),
        }

        try {
          await launchAnalysisWorker(runState, workerState)
        } catch (error) {
          runState.failures.push({
            workerIndex,
            source: pendingVideo.source,
            error: sanitizeError(error),
            finalMessage: '',
          })
          await cleanupWorkerArtifacts(workerState)
        }
      }

      if (
        !runState.cancelRequested &&
        runState.pendingQueue.length === 0 &&
        runState.workers.size === 0
      ) {
        await finalizeAnalysisRun(runState)
      }
    } while (runState.needsPump)
  } finally {
    runState.pumping = false
  }
}

async function refreshActiveRunProgress(runState) {
  const completedSources = await getCompletedPendingSources(
    runState.folderPath,
    runState.resumeContext.pendingVideos,
  )
  const completedFiles = completedSources.size
  const totalPending = runState.resumeContext.pendingCount
  const pendingFiles = Math.max(totalPending - completedFiles, 0)
  const percent = totalPending > 0 ? Math.round((completedFiles / totalPending) * 100) : 100

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
        ? `신규 분석 ${completedFiles}/${totalPending}개 완료`
        : `${totalPending}개 파일 분석을 시작합니다.`,
  })
  await writeRunSummary(runState, {
    status: 'running',
    completedFiles,
    pendingFiles,
    currentFile: nextPending?.source || '',
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

async function probeVideoMetadata(videoPath, ffprobeCommand, env) {
  try {
    const result = await runCommand(ffprobeCommand, [
      '-v', 'error',
      '-print_format', 'json',
      '-show_streams', '-show_format',
      '--', videoPath,
    ], env)

    if (!result.ok) {
      return null
    }

    const info = JSON.parse(result.stdout)
    const videoStream = info.streams?.find((s) => s.codec_type === 'video')
    const audioStream = info.streams?.find((s) => s.codec_type === 'audio')
    const duration = parseFloat(info.format?.duration || videoStream?.duration || '0')
    const width = videoStream?.width || 0
    const height = videoStream?.height || 0

    let fps = 0
    const fpsStr = videoStream?.r_frame_rate || videoStream?.avg_frame_rate || ''
    if (fpsStr && fpsStr !== '0/0') {
      const [num, den] = fpsStr.split('/')
      if (den && Number(den) > 0) {
        fps = Math.round(Number(num) / Number(den))
      }
    }

    return {
      durationSeconds: Math.round(duration * 100) / 100,
      width,
      height,
      fps,
      hasAudio: !!audioStream,
    }
  } catch {
    return null
  }
}

async function enrichPendingVideosWithMetadata(resumeContext, settings, sourceFolderPath) {
  if (resumeContext.pendingVideos.length === 0) {
    return
  }

  const ffprobeCommand = getDerivedFfprobeCommand(settings.ffmpegCommand)
  const env = buildChildEnv(settings)

  await Promise.all(
    resumeContext.pendingVideos.map(async (pendingVideo) => {
      const videoPath = path.join(sourceFolderPath, pendingVideo.fileName)
      const metadata = await probeVideoMetadata(videoPath, ffprobeCommand, env)
      if (metadata) {
        pendingVideo.metadata = metadata
        pendingVideo.sampleTimesSeconds = buildSuggestedSampleTimes(metadata.durationSeconds)
      }
    }),
  )
}

function buildSuggestedSampleTimes(durationSeconds) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return []
  }

  const rawCandidates = durationSeconds <= 3
    ? [0.4, durationSeconds * 0.4, Math.max(durationSeconds - 0.4, 0.6)]
    : [0.8, durationSeconds * 0.25, durationSeconds * 0.5, durationSeconds * 0.75, durationSeconds - 0.8]

  const rounded = rawCandidates
    .map((seconds) => Math.max(0, Math.min(durationSeconds, Math.round(seconds * 10) / 10)))
    .filter((seconds) => seconds < durationSeconds)

  return [...new Set(rounded)].sort((left, right) => left - right)
}

async function startAnalysis(sourceFolderPath) {
  if (activeRun) {
    throw new Error('이미 다른 폴더 분석이 실행 중입니다.')
  }

  const settings = await loadSettings()
  const environment = await getEnvironmentStatus(settings)
  if (!isEnvironmentReady(environment)) {
    throw new Error(
      ['분석을 시작할 수 없습니다.', ...collectEnvironmentIssues(environment)].join('\n'),
    )
  }

  const projectRootPath = getProjectRootPath(settings, sourceFolderPath)
  if (!isSameOrChildPath(projectRootPath, sourceFolderPath)) {
    throw new Error('선택한 폴더가 기본 디렉토리 밖에 있습니다.')
  }

  const resumeContext = await getResumeContext(projectRootPath, sourceFolderPath)
  await enrichPendingVideosWithMetadata(resumeContext, settings, sourceFolderPath)
  await writeTaskFile(projectRootPath, resumeContext)
  const maxParallel = Math.min(resolveMaxParallel(settings), Math.max(resumeContext.pendingCount, 1))
  const runState = await initializeRunArtifacts(
    projectRootPath,
    sourceFolderPath,
    resumeContext,
    settings,
    maxParallel,
  )
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
    const finalMessage = '같은 영상은 다시 분석하지 않고 기존 Markdown 결과를 사용했습니다.'
    emitAnalysisEvent({
      type: 'log',
      stream: 'stdout',
      message: `실행 로그 폴더: ${runState.runDirPath}`,
    })
    await appendRunEventLog(runState, 'stdout', `실행 로그 폴더: ${runState.runDirPath}`)
    await appendRunEventLog(runState, 'stdout', finalMessage)
    await writeRunSummary(runState, {
      status: 'completed',
      completedFiles: 0,
      pendingFiles: 0,
      currentFile: '',
      finalMessage,
      endedAt: new Date().toISOString(),
    })
    emitAnalysisEvent({ type: 'started', folderPath: projectRootPath, model: runState.codexModel, reasoningEffort: runState.codexReasoning })
    emitAnalysisEvent({
      type: 'completed',
      folderPath: projectRootPath,
      code: 0,
      finalMessage,
      analysis: await loadAnalysis(projectRootPath),
    })
    return { ok: true }
  }

  activeRun = runState
  emitAnalysisEvent({ type: 'started', folderPath: projectRootPath, model: runState.codexModel, reasoningEffort: runState.codexReasoning })
  startProgressPolling(runState)
  emitAnalysisEvent({
    type: 'log',
    stream: 'stdout',
    message: `실행 로그 폴더: ${runState.runDirPath}`,
  })
  void appendRunEventLog(runState, 'stdout', `실행 로그 폴더: ${runState.runDirPath}`)
  emitAnalysisEvent({
    type: 'log',
    stream: 'stdout',
    message: `병렬 분석 시작: 최대 ${runState.maxParallel}개 작업을 동시에 실행합니다.`,
  })
  void appendRunEventLog(
    runState,
    'stdout',
    `병렬 분석 시작: 최대 ${runState.maxParallel}개 작업을 동시에 실행합니다.`,
  )
  void pumpAnalysisQueue(runState)
  return { ok: true }
}

async function cancelAnalysis() {
  if (!activeRun) {
    return { ok: false }
  }

  const { folderPath } = activeRun
  activeRun.cancelRequested = true
  stopProgressPolling(activeRun)

  const killPromises = []

  for (const workerState of activeRun.workers.values()) {
    if (!workerState.child?.pid) {
      continue
    }

    const waitForExit = new Promise((resolve) => {
      if (workerState.closed) {
        resolve()
        return
      }

      const timeout = setTimeout(resolve, 5000)
      workerState.child.once('close', () => {
        clearTimeout(timeout)
        resolve()
      })
    })

    if (isWindows()) {
      spawn('taskkill', ['/pid', String(workerState.child.pid), '/t', '/f'], { windowsHide: true })
    } else {
      workerState.child.kill('SIGTERM')
    }

    killPromises.push(waitForExit)
  }

  await Promise.all(killPromises)

  await writeProgressFile(folderPath, { status: 'cancelled', message: '사용자가 분석을 취소했습니다.' })
  await appendRunEventLog(activeRun, 'stderr', '사용자가 분석을 취소했습니다.')
  await writeRunSummary(activeRun, {
    status: 'cancelled',
    currentFile: '',
    finalMessage: '사용자가 분석을 취소했습니다.',
    endedAt: new Date().toISOString(),
  })
  emitAnalysisEvent({ type: 'cancelled', folderPath })
  activeRun = null
  return { ok: true }
}

async function getEnvironmentStatus(settingsOverride = null) {
  const settings = settingsOverride ?? (await loadSettings())
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
    model: resolveCodexModel(settings),
    reasoningEffort: resolveCodexReasoning(settings),
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

  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  mainWindow.webContents.session.on('will-download', (event) => {
    event.preventDefault()
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
  protocol.handle(LOCAL_ASSET_SCHEME, async (request) => {
    try {
      const requestUrl = new URL(request.url)
      const filePath = requestUrl.searchParams.get('path')
      if (!filePath) {
        return new Response('Missing path', { status: 400 })
      }

      let stat
      try {
        stat = await fs.stat(filePath)
      } catch {
        return new Response('Not Found', { status: 404 })
      }
      if (!stat.isFile()) {
        return new Response('Not a file', { status: 400 })
      }

      const totalSize = stat.size
      const contentType = getLocalAssetContentType(filePath)
      const rangeHeader = request.headers.get('range') || request.headers.get('Range')

      if (request.method === 'HEAD') {
        return new Response(null, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(totalSize),
            'Accept-Ranges': 'bytes',
          },
        })
      }

      if (rangeHeader) {
        const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim())
        if (!match) {
          return new Response('Invalid Range', {
            status: 416,
            headers: {
              'Content-Range': `bytes */${totalSize}`,
              'Accept-Ranges': 'bytes',
            },
          })
        }

        const startRaw = match[1]
        const endRaw = match[2]
        let start
        let end

        if (startRaw === '' && endRaw === '') {
          return new Response('Invalid Range', {
            status: 416,
            headers: {
              'Content-Range': `bytes */${totalSize}`,
              'Accept-Ranges': 'bytes',
            },
          })
        }

        if (startRaw === '') {
          // Suffix range: last N bytes
          const suffixLength = Number(endRaw)
          if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
            return new Response('Invalid Range', {
              status: 416,
              headers: {
                'Content-Range': `bytes */${totalSize}`,
                'Accept-Ranges': 'bytes',
              },
            })
          }
          start = Math.max(0, totalSize - suffixLength)
          end = totalSize - 1
        } else {
          start = Number(startRaw)
          end = endRaw === '' ? totalSize - 1 : Number(endRaw)
        }

        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          start < 0 ||
          end < start ||
          start >= totalSize
        ) {
          return new Response('Range Not Satisfiable', {
            status: 416,
            headers: {
              'Content-Range': `bytes */${totalSize}`,
              'Accept-Ranges': 'bytes',
            },
          })
        }

        if (end >= totalSize) {
          end = totalSize - 1
        }

        const chunkSize = end - start + 1
        const nodeStream = createReadStream(filePath, { start, end })
        const webStream = Readable.toWeb(nodeStream)

        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(chunkSize),
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-cache',
          },
        })
      }

      const nodeStream = createReadStream(filePath)
      const webStream = Readable.toWeb(nodeStream)
      return new Response(webStream, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(totalSize),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache',
        },
      })
    } catch (error) {
      return new Response(`Internal error: ${error instanceof Error ? error.message : String(error)}`, {
        status: 500,
      })
    }
  })

  createWindow()

  readLatestRateLimits()
    .then((snapshot) => {
      if (snapshot) latestCodexRateLimits = snapshot
    })
    .catch(() => {})
  stopCodexRateLimitsWatcher = startRateLimitsWatcher((snapshot) => {
    emitCodexRateLimits(snapshot)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (stopCodexRateLimitsWatcher) {
    try { stopCodexRateLimitsWatcher() } catch { /* ignore */ }
    stopCodexRateLimitsWatcher = null
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('settings:get', async () => loadSettings())
ipcMain.handle('settings:save', async (_event, patch) => saveSettings(patch))
ipcMain.handle('environment:get', async () => getEnvironmentStatus())
ipcMain.handle('environment:prepare', async (_event, patch) => prepareEnvironment(patch))
ipcMain.handle('dialog:pick-root-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.canceled || result.filePaths.length === 0 ? '' : result.filePaths[0]
})
ipcMain.handle('folders:scan', async (_event, rootPath) => (rootPath ? collectVideoFolders(rootPath) : []))
ipcMain.handle('folders:tree', async (_event, rootPath) => loadFolderTree(rootPath))
ipcMain.handle('folders:videos', async (_event, rootPath, folderPath) =>
  loadFolderVideos(rootPath, folderPath),
)
ipcMain.handle('analysis:load', async (_event, folderPath) => loadAnalysis(folderPath))
ipcMain.handle('analysis:load-progress', async (_event, folderPath) => loadAnalysisProgress(folderPath))
ipcMain.handle('analysis:start', async (_event, folderPath) => startAnalysis(folderPath))
ipcMain.handle('analysis:cancel', async () => cancelAnalysis())
ipcMain.on('shell:start-drag', (event, payload) => {
  const filePath = typeof payload?.filePath === 'string' ? payload.filePath : ''
  const iconPath = typeof payload?.iconPath === 'string' ? payload.iconPath : ''

  if (!filePath) {
    return
  }

  event.sender.startDrag({
    file: filePath,
    icon: resolveDragIcon(iconPath),
  })
})
ipcMain.handle('shell:show-item', async (_event, targetPath) => {
  shell.showItemInFolder(targetPath)
  return true
})
ipcMain.handle('shell:open-path', async (_event, targetPath) => shell.openPath(targetPath))
ipcMain.handle('codex:get-rate-limits', async (_event, options = {}) => {
  if (!options?.force && latestCodexRateLimits) return latestCodexRateLimits
  const snapshot = await readLatestRateLimits()
  if (snapshot) latestCodexRateLimits = snapshot
  return latestCodexRateLimits
})
