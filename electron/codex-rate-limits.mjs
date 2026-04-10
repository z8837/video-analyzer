import { promises as fs } from 'node:fs'
import { createReadStream, watch as fsWatch } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SESSIONS_ROOT = path.join(os.homedir(), '.codex', 'sessions')
const TAIL_BYTES = 256 * 1024
const POLL_INTERVAL_MS = 15000
const SNAPSHOT_MAX_AGE_MS = 60 * 60 * 1000

async function listDirSafe(dirPath) {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true })
  } catch {
    return []
  }
}

function sortDesc(values) {
  return values.slice().sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
}

async function collectRecentRolloutFiles(limit = 32) {
  const candidates = []
  const years = sortDesc((await listDirSafe(SESSIONS_ROOT)).filter((e) => e.isDirectory()).map((e) => e.name))
  for (const year of years) {
    const yearDir = path.join(SESSIONS_ROOT, year)
    const months = sortDesc((await listDirSafe(yearDir)).filter((e) => e.isDirectory()).map((e) => e.name))
    for (const month of months) {
      const monthDir = path.join(yearDir, month)
      const days = sortDesc((await listDirSafe(monthDir)).filter((e) => e.isDirectory()).map((e) => e.name))
      for (const day of days) {
        const dayDir = path.join(monthDir, day)
        const files = (await listDirSafe(dayDir))
          .filter((e) => e.isFile() && e.name.startsWith('rollout-') && e.name.endsWith('.jsonl'))
          .map((e) => e.name)
        if (files.length === 0) continue
        const entries = await Promise.all(
          files.map(async (name) => {
            try {
              const filePath = path.join(dayDir, name)
              const stat = await fs.stat(filePath)
              return { filePath, mtimeMs: stat.mtimeMs }
            } catch {
              return null
            }
          }),
        )
        candidates.push(...entries.filter(Boolean))
      }
    }
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return candidates.slice(0, limit).map((entry) => entry.filePath)
}

export async function findLatestRolloutFile() {
  return (await collectRecentRolloutFiles(1))[0] ?? null
}

async function readTailLines(filePath) {
  let stat
  try {
    stat = await fs.stat(filePath)
  } catch {
    return []
  }
  const size = stat.size
  if (size === 0) return []
  const start = Math.max(0, size - TAIL_BYTES)
  return new Promise((resolve, reject) => {
    const chunks = []
    const stream = createReadStream(filePath, { start, end: size - 1, encoding: 'utf8' })
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('end', () => {
      const text = chunks.join('')
      const trimmed = start === 0 ? text : text.slice(text.indexOf('\n') + 1)
      resolve(trimmed.split('\n').filter(Boolean))
    })
    stream.on('error', reject)
  })
}

function extractSessionIdFromPath(filePath) {
  const base = path.basename(filePath, '.jsonl')
  const parts = base.split('-')
  if (parts.length < 6) return null
  return parts.slice(parts.length - 5).join('-')
}

function toUnixSeconds(timestamp) {
  if (typeof timestamp !== 'string') return Math.floor(Date.now() / 1000)
  const ms = Date.parse(timestamp)
  return Number.isNaN(ms) ? Math.floor(Date.now() / 1000) : Math.floor(ms / 1000)
}

function normalizeWindow(raw, observedAtSeconds) {
  if (!raw || typeof raw !== 'object') return null
  const usedPercent = typeof raw.used_percent === 'number' ? raw.used_percent : null
  const windowMinutes = typeof raw.window_minutes === 'number' ? raw.window_minutes : null
  const resetsAt =
    typeof raw.resets_at === 'number'
      ? raw.resets_at
      : typeof raw.resets_in_seconds === 'number'
        ? observedAtSeconds + raw.resets_in_seconds
        : null
  if (usedPercent == null && windowMinutes == null && resetsAt == null) return null
  return { usedPercent, windowMinutes, resetsAt }
}

function normalizeTokenUsage(raw) {
  if (!raw || typeof raw !== 'object') return null
  const usage = {
    inputTokens: typeof raw.input_tokens === 'number' ? raw.input_tokens : null,
    cachedInputTokens: typeof raw.cached_input_tokens === 'number' ? raw.cached_input_tokens : null,
    outputTokens: typeof raw.output_tokens === 'number' ? raw.output_tokens : null,
    reasoningOutputTokens:
      typeof raw.reasoning_output_tokens === 'number' ? raw.reasoning_output_tokens : null,
    totalTokens: typeof raw.total_tokens === 'number' ? raw.total_tokens : null,
  }
  return Object.values(usage).some((value) => value != null) ? usage : null
}

function normalizeCredits(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    hasCredits: typeof raw.has_credits === 'boolean' ? raw.has_credits : null,
    unlimited: typeof raw.unlimited === 'boolean' ? raw.unlimited : null,
    balance:
      typeof raw.balance === 'string' || typeof raw.balance === 'number'
        ? String(raw.balance)
        : null,
  }
}

function buildSnapshot({ rateLimits, tokenInfo, filePath, timestamp }) {
  const observedAtSeconds = toUnixSeconds(timestamp)
  const primary = normalizeWindow(rateLimits?.primary, observedAtSeconds)
  const secondary = normalizeWindow(rateLimits?.secondary, observedAtSeconds)
  const totalTokenUsage = normalizeTokenUsage(tokenInfo?.total_token_usage)
  const lastTokenUsage = normalizeTokenUsage(tokenInfo?.last_token_usage)
  const credits = normalizeCredits(rateLimits?.credits)
  const limitId = typeof rateLimits?.limit_id === 'string' ? rateLimits.limit_id : null
  const planType = typeof rateLimits?.plan_type === 'string' ? rateLimits.plan_type : null
  const modelContextWindow =
    typeof tokenInfo?.model_context_window === 'number' ? tokenInfo.model_context_window : null

  if (!primary && !secondary && !totalTokenUsage && !lastTokenUsage && !limitId && !planType && !credits) {
    return null
  }

  return {
    primary,
    secondary,
    limitId,
    planType,
    credits,
    totalTokenUsage,
    lastTokenUsage,
    modelContextWindow,
    observedAt: typeof timestamp === 'string' ? timestamp : new Date().toISOString(),
    checkedAt: new Date().toISOString(),
    sourceSessionId: extractSessionIdFromPath(filePath),
  }
}

function isRecentSnapshot(snapshot) {
  const observedAtMs = Date.parse(snapshot?.observedAt ?? '')
  if (Number.isNaN(observedAtMs)) return false
  return Date.now() - observedAtMs <= SNAPSHOT_MAX_AGE_MS
}

function hasFreshWindow(limitWindow) {
  if (!limitWindow) return false
  if (limitWindow.resetsAt == null) return true
  return limitWindow.resetsAt * 1000 > Date.now()
}

function hasUsageNumbers(snapshot) {
  if (!isRecentSnapshot(snapshot)) return false
  return Boolean(
    hasFreshWindow(snapshot?.primary) ||
      hasFreshWindow(snapshot?.secondary) ||
      snapshot?.totalTokenUsage ||
      snapshot?.lastTokenUsage,
  )
}

async function readLatestSnapshotFromFile(filePath) {
  const lines = await readTailLines(filePath)
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]
    if (!line.includes('rate_limits') && !line.includes('token_usage')) continue
    try {
      const parsed = JSON.parse(line)
      const snapshot = buildSnapshot({
        rateLimits: parsed?.payload?.rate_limits,
        tokenInfo: parsed?.payload?.info,
        filePath,
        timestamp: parsed?.timestamp,
      })
      if (snapshot) return snapshot
    } catch {
      continue
    }
  }
  return null
}

export async function readLatestRateLimits() {
  // Scan latest files first; if the newest has null rate_limits (e.g. limit_id premium),
  // fall back to older files to surface the most recent populated snapshot.
  const candidates = await collectRecentRolloutFiles(32)
  let fallbackSnapshot = null
  for (const filePath of candidates) {
    const snapshot = await readLatestSnapshotFromFile(filePath)
    if (!snapshot) continue
    if (hasUsageNumbers(snapshot)) return snapshot
    fallbackSnapshot ??= snapshot
  }
  return fallbackSnapshot
}

export function startRateLimitsWatcher(onUpdate) {
  let stopped = false
  let pollTimer = null
  let watcher = null
  let watchedDir = null
  let lastSerialized = null

  const tick = async () => {
    if (stopped) return
    try {
      const snapshot = await readLatestRateLimits()
      if (snapshot) {
        const serialized = JSON.stringify({
          p: snapshot.primary,
          s: snapshot.secondary,
          plan: snapshot.planType,
          limit: snapshot.limitId,
          last: snapshot.lastTokenUsage?.totalTokens,
          total: snapshot.totalTokenUsage?.totalTokens,
        })
        if (serialized !== lastSerialized) {
          lastSerialized = serialized
          onUpdate(snapshot)
        }
      }
      const latestFile = await findLatestRolloutFile()
      if (latestFile) {
        const dir = path.dirname(latestFile)
        if (dir !== watchedDir) {
          if (watcher) {
            try { watcher.close() } catch { /* ignore */ }
          }
          watchedDir = dir
          try {
            watcher = fsWatch(dir, { persistent: false }, () => {
              tick().catch(() => {})
            })
          } catch {
            watcher = null
          }
        }
      }
    } catch {
      // ignore
    }
  }

  tick().catch(() => {})
  pollTimer = setInterval(() => {
    tick().catch(() => {})
  }, POLL_INTERVAL_MS)

  return () => {
    stopped = true
    if (pollTimer) clearInterval(pollTimer)
    if (watcher) {
      try { watcher.close() } catch { /* ignore */ }
    }
  }
}
