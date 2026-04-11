import { promises as fs } from 'node:fs'
import path from 'node:path'

export const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
  '.mkv',
  '.avi',
  '.webm',
  '.m4v',
  '.wmv',
])

export const IGNORED_FOLDERS = new Set(['analyze', '.git', '.codex', 'node_modules'])

export function toPosixPath(filePath) {
  return filePath.replace(/\\/g, '/')
}

export function isSameOrChildPath(parentPath, candidatePath) {
  const relative = path.relative(parentPath, candidatePath)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

export function getProjectRootPath(settings, folderPath) {
  if (settings.lastRootPath && isSameOrChildPath(settings.lastRootPath, folderPath)) {
    return settings.lastRootPath
  }

  return folderPath
}

export function getFolderRelativePath(projectRootPath, folderPath) {
  return toPosixPath(path.relative(projectRootPath, folderPath) || '.')
}

export function getProjectRelativeVideoPath(projectRootPath, folderPath, relativeVideoPath) {
  return toPosixPath(path.relative(projectRootPath, path.join(folderPath, relativeVideoPath)))
}

export function getAnalyzePaths(projectRootPath) {
  const analyzeDir = path.join(projectRootPath, 'analyze')
  return {
    analyzeDir,
    libraryDir: path.join(analyzeDir, '_library'),
    runsDir: path.join(analyzeDir, 'runs'),
    taskPath: path.join(analyzeDir, '_task.json'),
    progressPath: path.join(analyzeDir, 'progress.json'),
    legacyResultsPath: path.join(analyzeDir, 'results.json'),
  }
}

function getFolderStorageSegments(folderRelativePath) {
  return folderRelativePath === '.'
    ? ['_root']
    : folderRelativePath.split('/').filter(Boolean)
}

function getStoredFileName(relativeVideoPath) {
  const normalized = toPosixPath(relativeVideoPath)
  const parsed = path.posix.parse(normalized)
  const safeDir = parsed.dir === '.' ? '' : `__${parsed.dir.replaceAll('/', '__')}`
  const safeExt = parsed.ext ? parsed.ext.replace('.', '_') : ''
  return `${parsed.name}${safeExt}${safeDir}`
}

export function getAnalyzeAssetRelativePaths(folderRelativePath, relativeVideoPath) {
  const folderSegments = getFolderStorageSegments(folderRelativePath)
  const storedFileName = getStoredFileName(relativeVideoPath)
  const baseSegments = ['_library', ...folderSegments]

  return {
    analysisFile: path.posix.join(...baseSegments, `${storedFileName}.md`),
    sampleImage: path.posix.join(...baseSegments, 'samples', `${storedFileName}.jpg`),
  }
}

function isVideoFileName(fileName) {
  return VIDEO_EXTENSIONS.has(path.extname(fileName).toLowerCase())
}

export async function listDirectVideoFiles(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && isVideoFileName(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))
}

export async function collectVideoFolders(rootPath) {
  const collected = []

  async function visit(folderPath) {
    const entries = await fs.readdir(folderPath, { withFileTypes: true })
    const videoCount = entries.filter((entry) => entry.isFile() && isVideoFileName(entry.name)).length

    if (videoCount > 0) {
      collected.push({
        name: path.basename(folderPath),
        path: folderPath,
        relativePath: path.relative(rootPath, folderPath) || '.',
        videoCount,
      })
    }

    const subdirectories = entries
      .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
      .filter((entry) => !IGNORED_FOLDERS.has(entry.name))
      .sort((left, right) => left.name.localeCompare(right.name))

    for (const entry of subdirectories) {
      await visit(path.join(folderPath, entry.name))
    }
  }

  await visit(rootPath)
  return collected
}

export async function collectFolderTree(rootPath) {
  async function visit(folderPath) {
    const entries = await fs.readdir(folderPath, { withFileTypes: true })
    const directVideoCount = entries.filter(
      (entry) => entry.isFile() && isVideoFileName(entry.name),
    ).length

    const subdirectories = entries
      .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
      .filter((entry) => !IGNORED_FOLDERS.has(entry.name))
      .sort((left, right) => left.name.localeCompare(right.name))

    const children = []
    for (const entry of subdirectories) {
      children.push(await visit(path.join(folderPath, entry.name)))
    }

    const totalVideoCount = directVideoCount + children.reduce(
      (sum, child) => sum + child.totalVideoCount,
      0,
    )

    return {
      name: path.basename(folderPath),
      path: folderPath,
      relativePath: toPosixPath(path.relative(rootPath, folderPath) || '.'),
      directVideoCount,
      totalVideoCount,
      children,
    }
  }

  return visit(rootPath)
}

export async function collectProjectVideoFiles(rootPath) {
  const collected = []

  async function visit(folderPath) {
    const entries = await fs.readdir(folderPath, { withFileTypes: true })
    const sortedEntries = entries.sort((left, right) => left.name.localeCompare(right.name))

    for (const entry of sortedEntries) {
      const entryPath = path.join(folderPath, entry.name)

      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        if (!IGNORED_FOLDERS.has(entry.name)) {
          await visit(entryPath)
        }
        continue
      }

      if (!entry.isFile() || !isVideoFileName(entry.name)) {
        continue
      }

      const source = toPosixPath(path.relative(rootPath, entryPath))
      collected.push({
        fileName: entry.name,
        absolutePath: entryPath,
        source,
        folderRelativePath:
          path.posix.dirname(source) === '.' ? '.' : path.posix.dirname(source),
      })
    }
  }

  await visit(rootPath)
  return collected
}

export async function readTextIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return ''
  }
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch {
    return null
  }
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8')
}

export async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, value, 'utf8')
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function uniqueStrings(values) {
  const seen = new Set()
  const normalized = []

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue
    }

    seen.add(value)
    normalized.push(value)
  }

  return normalized
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', 'yes', '1', '있음'].includes(normalized)) {
      return true
    }
    if (['false', 'no', '0', '없음'].includes(normalized)) {
      return false
    }
  }

  return null
}

function normalizeNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function normalizeKeywordMoment(value) {
  if (typeof value === 'string') {
    const label = value.trim()
    return label ? { label, timeSeconds: null } : null
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const label = (
    value.label ||
    value.keyword ||
    value.name ||
    value.text ||
    ''
  )
    .toString()
    .trim()

  if (!label) {
    return null
  }

  const rawTime =
    value.timeSeconds ??
    value.seconds ??
    value.time ??
    value.timestampSeconds ??
    null
  const normalizedTime = normalizeNumber(rawTime)

  return {
    label,
    timeSeconds:
      normalizedTime == null ? null : Math.max(0, Math.round(normalizedTime * 10) / 10),
  }
}

function normalizeKeywordMoments(value) {
  if (!Array.isArray(value)) {
    return []
  }

  const moments = []
  const seen = new Set()

  for (const item of value) {
    const normalized = normalizeKeywordMoment(item)
    if (!normalized || seen.has(normalized.label)) {
      continue
    }

    seen.add(normalized.label)
    moments.push(normalized)

    if (moments.length >= 8) {
      break
    }
  }

  return moments
}

export function isLikelyCorruptedText(value) {
  return typeof value === 'string' && /\?{3,}/.test(value) && !/[가-힣]/.test(value)
}

export function normalizeAnalysisRecord(raw, defaults = {}, options = {}) {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const rejectCorruptedText = options.rejectCorruptedText === true
  const source = toPosixPath(
    raw.source || raw.projectRelativePath || raw.relativePath || raw.fileName || '',
  )
  if (!source) {
    return null
  }

  let title =
    (typeof raw.title === 'string' && raw.title.trim()) ||
    path.posix.basename(source)
  let summary =
    (typeof raw.summary === 'string' && raw.summary.trim()) ||
    '영상 내용을 요약하지 못했습니다.'
  let details = normalizeStringArray(raw.details).slice(0, 12)
  let categories = normalizeStringArray(raw.categories).slice(0, 5)
  let keywordMoments = normalizeKeywordMoments(raw.keywordMoments)
  let keywords = uniqueStrings([
    ...keywordMoments.map((keywordMoment) => keywordMoment.label),
    ...normalizeStringArray(raw.keywords),
  ]).slice(0, 8)
  keywordMoments = keywordMoments.filter((keywordMoment) => keywords.includes(keywordMoment.label))
  const searchableText = [title, summary, ...details, ...categories, ...keywords].join(' ')
  const corruptedText = isLikelyCorruptedText(searchableText)

  if (corruptedText) {
    if (rejectCorruptedText) {
      return null
    }

    const fallbackFileName =
      raw.fileName ||
      path.posix.basename(source)
    title = `${fallbackFileName} 분석 텍스트 손상`
    summary = '기존 분석 파일의 한글 텍스트가 손상되었습니다. 다시 분석하면 정상 내용을 생성할 수 있습니다.'
    details = ['기존 분석 마크다운의 본문이 물음표로 손상되어 장면 설명을 복구하지 못했습니다.']
    categories = []
    keywords = []
    keywordMoments = []
  }

  return {
    schemaVersion: 1,
    source,
    fileName: raw.fileName || path.posix.basename(source),
    folderRelativePath:
      raw.folderRelativePath ||
      (path.posix.dirname(source) === '.' ? '.' : path.posix.dirname(source)),
    title,
    summary,
    details,
    categories,
    keywords,
    keywordMoments,
    durationSeconds: normalizeNumber(raw.durationSeconds),
    width: normalizeNumber(raw.width),
    height: normalizeNumber(raw.height),
    fps: normalizeNumber(raw.fps),
    hasAudio: normalizeBoolean(raw.hasAudio),
    sampleImage:
      typeof raw.sampleImage === 'string' && raw.sampleImage.trim()
        ? toPosixPath(raw.sampleImage.trim())
        : '',
    generatedAt:
      (typeof raw.generatedAt === 'string' && raw.generatedAt.trim()) ||
      defaults.generatedAt ||
      '',
    model:
      (typeof raw.model === 'string' && raw.model.trim()) ||
      defaults.model ||
      'gpt-5.4',
    reasoningEffort:
      (typeof raw.reasoningEffort === 'string' && raw.reasoningEffort.trim()) ||
      defaults.reasoningEffort ||
      'xhigh',
    corruptedText,
  }
}

export function extractJsonFence(markdown) {
  const match = markdown.match(/```json\s*([\s\S]*?)\s*```/i)
  return match ? match[1] : ''
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractLabeledValue(markdown, labels) {
  for (const label of labels) {
    const match = markdown.match(
      new RegExp(`^-\\s*${escapeRegExp(label)}\\s*:?\\s*(.+)$`, 'mi'),
    )
    if (match?.[1]) {
      return match[1].trim().replace(/^`|`$/g, '')
    }
  }

  return ''
}

function extractSectionBody(markdown, headings) {
  for (const heading of headings) {
    const match = markdown.match(
      new RegExp(`^##\\s*${escapeRegExp(heading)}\\s*$([\\s\\S]*?)(?=^##\\s|\\Z)`, 'mi'),
    )
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  return ''
}

function parseKeywordMomentsLine(value) {
  if (!value) {
    return []
  }

  return normalizeKeywordMoments(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const match = item.match(/^(.*?)\s*(?:@|\()\s*([\d.]+)\s*초\)?$/)
        if (!match?.[1]) {
          return item
        }

        return {
          label: match[1].trim(),
          timeSeconds: Number(match[2]),
        }
      }),
  )
}

export function parseLegacyMarkdown(markdown) {
  const titleMatch = markdown.match(/^#\s+(.+)$/m)
  if (!titleMatch?.[1]) {
    return null
  }

  const source =
    extractLabeledValue(markdown, ['프로젝트 상대 경로', '원본 경로']) ||
    extractLabeledValue(markdown, ['source'])
  const fileName =
    extractLabeledValue(markdown, ['원본 파일명', '파일명']) ||
    (source ? path.posix.basename(toPosixPath(source)) : '')
  if (!source && !fileName) {
    return null
  }

  const summarySection = extractSectionBody(markdown, ['추정 내용', '요약'])
  const detailsSection = extractSectionBody(markdown, ['눈에 띄는 장면', '세부 설명'])
  const categoryLine = extractLabeledValue(markdown, ['카테고리'])
  const keywordLine = extractLabeledValue(markdown, ['키워드'])
  const keywordMomentLine = extractLabeledValue(markdown, ['키워드 시점', '키워드 시간'])
  const durationLine = extractLabeledValue(markdown, ['길이'])
  const widthHeightLine = extractLabeledValue(markdown, ['해상도'])
  const fpsLine = extractLabeledValue(markdown, ['FPS'])
  const audioLine = extractLabeledValue(markdown, ['오디오'])

  const durationMatch = durationLine.match(/([\d.]+)/)
  const sizeMatch = widthHeightLine.match(/(\d+)\s*[×x]\s*(\d+)/)
  const fpsMatch = fpsLine.match(/([\d.]+)/)

  return {
    source: source ? toPosixPath(source) : fileName,
    fileName: fileName || path.posix.basename(toPosixPath(source)),
    title: titleMatch[1].trim(),
    summary: summarySection.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join(' '),
    details: detailsSection
      .split(/\r?\n/)
      .map((line) => line.replace(/^-+\s*/, '').trim())
      .filter(Boolean),
    categories: categoryLine
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    keywords: keywordLine
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    keywordMoments: parseKeywordMomentsLine(keywordMomentLine),
    durationSeconds: durationMatch ? Number(durationMatch[1]) : null,
    width: sizeMatch ? Number(sizeMatch[1]) : null,
    height: sizeMatch ? Number(sizeMatch[2]) : null,
    fps: fpsMatch ? Number(fpsMatch[1]) : null,
    hasAudio: audioLine || null,
  }
}

export function buildMarkdownFromRecord(record) {
  const payload = {
    schemaVersion: 1,
    source: record.source,
    fileName: record.fileName,
    title: record.title,
    summary: record.summary,
    details: record.details,
    categories: record.categories,
    keywords: record.keywords,
    keywordMoments: record.keywordMoments || [],
    durationSeconds: record.durationSeconds,
    width: record.width,
    height: record.height,
    fps: record.fps,
    hasAudio: record.hasAudio,
    sampleImage: record.sampleImage || '',
    generatedAt: record.generatedAt || '',
    model: record.model || 'gpt-5.4',
    reasoningEffort: record.reasoningEffort || 'xhigh',
  }

  return [
    `# ${record.title}`,
    '',
    '```json',
    JSON.stringify(payload, null, 2),
    '```',
    '',
    '## 기본 정보',
    `- 원본 파일명: \`${record.fileName}\``,
    `- 원본 경로: \`${record.source}\``,
    ...(record.durationSeconds != null ? [`- 길이: ${record.durationSeconds.toFixed(2)}초`] : []),
    ...(record.width != null && record.height != null ? [`- 해상도: ${record.width}×${record.height}`] : []),
    ...(record.fps != null ? [`- FPS: 약 ${record.fps.toFixed(2)}`] : []),
    ...(record.hasAudio != null ? [`- 오디오: ${record.hasAudio ? '있음' : '없음'}`] : []),
    '',
    '## 요약',
    record.summary,
    '',
    '## 눈에 띄는 장면',
    ...(record.details.length > 0
      ? record.details.map((detail) => `- ${detail}`)
      : ['- 화면 내용을 자세히 확인하지 못했습니다.']),
    '',
    '## 태그',
    `- 카테고리: ${record.categories.join(', ') || '없음'}`,
    `- 키워드: ${record.keywords.join(', ') || '없음'}`,
    `- 키워드 시점: ${
      (record.keywordMoments || [])
        .map((keywordMoment) =>
          keywordMoment.timeSeconds == null
            ? keywordMoment.label
            : `${keywordMoment.label} @ ${keywordMoment.timeSeconds.toFixed(1)}초`,
        )
        .join(', ') || '없음'
    }`,
    '',
  ].join('\n')
}
