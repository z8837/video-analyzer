import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  collectProjectVideoFiles,
  extractJsonFence,
  fileExists,
  getAnalyzeAssetRelativePaths,
  getAnalyzePaths,
  getFolderRelativePath,
  getProjectRelativeVideoPath,
  listDirectVideoFiles,
  normalizeAnalysisRecord,
  parseLegacyMarkdown,
  readJsonIfExists,
  readTextIfExists,
  toPosixPath,
  writeJson,
  writeText,
  buildMarkdownFromRecord,
} from './library-data.mjs'

async function collectMarkdownFiles(folderPath) {
  if (!(await fileExists(folderPath))) {
    return []
  }

  const collected = []

  async function visit(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true })
    const sortedEntries = entries.sort((left, right) => left.name.localeCompare(right.name))

    for (const entry of sortedEntries) {
      const entryPath = path.join(currentPath, entry.name)
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        await visit(entryPath)
        continue
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        collected.push(entryPath)
      }
    }
  }

  await visit(folderPath)
  return collected.sort((left, right) => left.localeCompare(right))
}

function parseJsonObjectFromText(text) {
  const trimmed = text.replace(/^\uFEFF/, '').trim()
  if (!trimmed) {
    throw new Error('Codex 최종 응답이 비어 있습니다.')
  }

  const candidates = []
  const fencedJson = extractJsonFence(trimmed)
  if (fencedJson) {
    candidates.push(fencedJson.trim())
  }

  candidates.push(trimmed)

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1))
  }

  const seen = new Set()

  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) {
      continue
    }

    seen.add(candidate)

    try {
      return JSON.parse(candidate)
    } catch {
      // Try the next candidate shape.
    }
  }

  throw new Error('Codex 최종 응답을 JSON으로 해석하지 못했습니다.')
}

export function parseAnalysisBatchResponse(responseText, defaults = {}) {
  const payload = parseJsonObjectFromText(responseText)
  const rawAnalyses = Array.isArray(payload?.analyses)
    ? payload.analyses
    : Array.isArray(payload?.videos)
      ? payload.videos
      : null

  if (!rawAnalyses) {
    throw new Error('Codex 최종 응답에 analyses 배열이 없습니다.')
  }

  const analyses = []
  const seenSources = new Set()

  for (const rawAnalysis of rawAnalyses) {
    const record = normalizeAnalysisRecord(rawAnalysis, defaults, {
      rejectCorruptedText: true,
    })

    if (!record) {
      throw new Error('Codex가 손상되었거나 불완전한 분석 레코드를 반환했습니다.')
    }

    if (seenSources.has(record.source)) {
      throw new Error(`Codex가 동일한 영상 결과를 중복 반환했습니다: ${record.source}`)
    }

    seenSources.add(record.source)
    analyses.push(record)
  }

  return {
    message:
      typeof payload.message === 'string' && payload.message.trim()
        ? payload.message.trim()
        : '',
    analyses,
  }
}

function getRecordFileNameCandidates(record) {
  const candidates = []

  if (typeof record.fileName === 'string' && record.fileName.trim()) {
    candidates.push(path.posix.basename(toPosixPath(record.fileName.trim())))
  }

  if (typeof record.source === 'string' && record.source.trim()) {
    candidates.push(path.posix.basename(toPosixPath(record.source.trim())))
  }

  return new Set(candidates.filter(Boolean))
}

function findPendingVideoForRecord(record, pendingVideos, pendingBySource) {
  const exactMatch = pendingBySource.get(record.source)
  if (exactMatch) {
    return exactMatch
  }

  const fileNameCandidates = getRecordFileNameCandidates(record)
  if (fileNameCandidates.size === 0) {
    return null
  }

  const matchingVideos = pendingVideos.filter((pendingVideo) =>
    fileNameCandidates.has(path.posix.basename(toPosixPath(pendingVideo.source))),
  )

  return matchingVideos.length === 1 ? matchingVideos[0] : null
}

export async function writePendingAnalysesFromReport(
  projectRootPath,
  resumeContext,
  responseText,
  defaults = {},
) {
  const { message, analyses } = parseAnalysisBatchResponse(responseText, defaults)
  const pendingBySource = new Map(
    resumeContext.pendingVideos.map((pendingVideo) => [pendingVideo.source, pendingVideo]),
  )
  const writtenSources = new Set()

  for (const record of analyses) {
    const pendingVideo = findPendingVideoForRecord(
      record,
      resumeContext.pendingVideos,
      pendingBySource,
    )
    if (!pendingVideo) {
      throw new Error(`Codex가 요청하지 않은 영상 결과를 반환했습니다: ${record.source}`)
    }
    if (writtenSources.has(pendingVideo.source)) {
      throw new Error(`Codex가 동일한 영상 결과를 중복 반환했습니다: ${pendingVideo.source}`)
    }

    const outputPath = path.join(projectRootPath, pendingVideo.outputMarkdown)
    const nextRecord = {
      ...record,
      source: pendingVideo.source,
      fileName: pendingVideo.fileName,
      folderRelativePath: pendingVideo.folderRelativePath,
    }

    await writeText(outputPath, buildMarkdownFromRecord(nextRecord))
    writtenSources.add(pendingVideo.source)
  }

  const missingVideos = resumeContext.pendingVideos.filter(
    (pendingVideo) => !writtenSources.has(pendingVideo.source),
  )
  if (missingVideos.length > 0) {
    throw new Error(
      `Codex가 ${missingVideos.length}개 영상의 분석 결과를 반환하지 않았습니다.`,
    )
  }

  return {
    message: message || `${writtenSources.size}개 영상을 분석했습니다.`,
    writtenCount: writtenSources.size,
  }
}

export async function migrateLegacyResultsToMarkdown(projectRootPath) {
  const { analyzeDir, legacyResultsPath } = getAnalyzePaths(projectRootPath)
  const legacyResults = await readJsonIfExists(legacyResultsPath)

  if (!legacyResults?.videos?.length) {
    return
  }

  for (const legacyVideo of legacyResults.videos) {
    const source = toPosixPath(
      legacyVideo.projectRelativePath || legacyVideo.relativePath || legacyVideo.fileName || '',
    )
    if (!source) {
      continue
    }

    const folderRelativePath =
      path.posix.dirname(source) === '.' ? '.' : path.posix.dirname(source)
    const targetRelativePath = getAnalyzeAssetRelativePaths(folderRelativePath, source).analysisFile
    const targetPath = path.join(analyzeDir, targetRelativePath)

    if (await fileExists(targetPath)) {
      continue
    }

    const record = normalizeAnalysisRecord(legacyVideo, {
      generatedAt: legacyResults.generatedAt || '',
      model: legacyResults.model || 'gpt-5.4',
      reasoningEffort: legacyResults.reasoningEffort || 'xhigh',
    })
    if (!record) {
      continue
    }

    const sampleImage =
      typeof legacyVideo.sampleImage === 'string' && legacyVideo.sampleImage.trim()
        ? toPosixPath(legacyVideo.sampleImage.trim())
        : ''
    if (sampleImage && (await fileExists(path.join(analyzeDir, sampleImage)))) {
      record.sampleImage = sampleImage
    }

    await writeText(targetPath, buildMarkdownFromRecord(record))
  }
}

export async function readLibraryEntries(projectRootPath) {
  await migrateLegacyResultsToMarkdown(projectRootPath)

  const { analyzeDir } = getAnalyzePaths(projectRootPath)
  const markdownPaths = await collectMarkdownFiles(analyzeDir)
  const bySource = new Map()
  let newestTimestamp = 0

  for (const markdownPath of markdownPaths) {
    const [markdown, stat] = await Promise.all([
      readTextIfExists(markdownPath),
      fs.stat(markdownPath),
    ])
    const jsonBlock = extractJsonFence(markdown)

    try {
      const parsed = jsonBlock ? JSON.parse(jsonBlock) : parseLegacyMarkdown(markdown)
      const record = normalizeAnalysisRecord(parsed)
      if (!record) {
        continue
      }

      newestTimestamp = Math.max(newestTimestamp, stat.mtimeMs)
      const existing = bySource.get(record.source)
      if (!existing || stat.mtimeMs >= existing.mtimeMs) {
        bySource.set(record.source, {
          record,
          markdownPath,
          markdown,
          mtimeMs: stat.mtimeMs,
        })
      }
    } catch {
      // Ignore invalid partial files.
    }
  }

  return {
    entries: [...bySource.values()].sort((left, right) =>
      left.record.source.localeCompare(right.record.source, 'ko'),
    ),
    generatedAt: newestTimestamp > 0 ? new Date(newestTimestamp).toISOString() : '',
  }
}

function cloneEntryWithResolvedVideo(entry, resolvedVideo) {
  return {
    ...entry,
    record: {
      ...entry.record,
      source: resolvedVideo.source,
      fileName: resolvedVideo.fileName,
      folderRelativePath: resolvedVideo.folderRelativePath,
    },
  }
}

export async function readResolvedLibraryEntries(projectRootPath) {
  const { entries, generatedAt } = await readLibraryEntries(projectRootPath)
  const projectVideos = await collectProjectVideoFiles(projectRootPath)
  const projectVideoBySource = new Map(projectVideos.map((video) => [video.source, video]))
  const usedSources = new Set()
  const unresolvedEntries = []
  const resolvedEntries = []

  for (const entry of entries) {
    const exactVideo = projectVideoBySource.get(entry.record.source)
    if (exactVideo) {
      usedSources.add(exactVideo.source)
      resolvedEntries.push(entry)
      continue
    }

    unresolvedEntries.push(entry)
  }

  const remainingByFileName = new Map()
  for (const video of projectVideos) {
    if (usedSources.has(video.source)) {
      continue
    }

    const candidates = remainingByFileName.get(video.fileName) ?? []
    candidates.push(video)
    remainingByFileName.set(video.fileName, candidates)
  }

  for (const entry of unresolvedEntries) {
    const candidates = remainingByFileName.get(entry.record.fileName) ?? []

    if (candidates.length === 1) {
      const [resolvedVideo] = candidates
      usedSources.add(resolvedVideo.source)
      remainingByFileName.delete(entry.record.fileName)
      resolvedEntries.push(cloneEntryWithResolvedVideo(entry, resolvedVideo))
      continue
    }

    resolvedEntries.push(entry)
  }

  return {
    entries: resolvedEntries.sort((left, right) =>
      left.record.source.localeCompare(right.record.source, 'ko'),
    ),
    generatedAt,
  }
}

export async function getResumeContext(projectRootPath, sourceFolderPath) {
  const { entries } = await readResolvedLibraryEntries(projectRootPath)
  const existingByPath = new Map(entries.map((entry) => [entry.record.source, entry]))
  const directVideoFiles = await listDirectVideoFiles(sourceFolderPath)
  const folderRelativePath = getFolderRelativePath(projectRootPath, sourceFolderPath)
  const reusableEntries = []
  const pendingVideos = []

  for (const fileName of directVideoFiles) {
    const source = getProjectRelativeVideoPath(projectRootPath, sourceFolderPath, fileName)
    const existing = existingByPath.get(source)
    if (existing && !existing.record.corruptedText) {
      reusableEntries.push(existing)
      continue
    }

    pendingVideos.push({
      fileName,
      source,
      folderRelativePath,
      outputMarkdown: path.posix.join(
        'analyze',
        getAnalyzeAssetRelativePaths(folderRelativePath, source).analysisFile,
      ),
    })
  }

  return {
    generatedAt: new Date().toISOString(),
    projectRootPath,
    sourceFolderPath,
    folderRelativePath,
    directVideoFiles,
    totalFiles: directVideoFiles.length,
    reusableCount: reusableEntries.length,
    pendingCount: pendingVideos.length,
    reusableEntries,
    pendingVideos,
  }
}

export async function writeTaskFile(projectRootPath, resumeContext) {
  const { taskPath } = getAnalyzePaths(projectRootPath)
  await writeJson(taskPath, {
    schemaVersion: 1,
    generatedAt: resumeContext.generatedAt,
    projectRootPath,
    sourceFolderPath: resumeContext.sourceFolderPath,
    sourceFolderRelativePath: resumeContext.folderRelativePath,
    totalFiles: resumeContext.totalFiles,
    reusableCount: resumeContext.reusableCount,
    pendingCount: resumeContext.pendingCount,
    pendingVideos: resumeContext.pendingVideos,
  })
}

export async function getCompletedPendingSources(projectRootPath, pendingVideos) {
  const completedSources = new Set()

  for (const pendingVideo of pendingVideos) {
    const markdownPath = path.join(projectRootPath, pendingVideo.outputMarkdown)
    const markdown = await readTextIfExists(markdownPath)
    if (!markdown) {
      continue
    }

    try {
      const parsed = JSON.parse(extractJsonFence(markdown))
      const record = normalizeAnalysisRecord(parsed, {}, { rejectCorruptedText: true })
      if (record?.source === pendingVideo.source) {
        completedSources.add(pendingVideo.source)
      }
    } catch {
      // Ignore incomplete files until they are valid.
    }
  }

  return completedSources
}
