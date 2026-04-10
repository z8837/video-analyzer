import type { CodexRateLimitWindow, CodexRateLimitsSnapshot, CodexTokenUsage } from '../types'

type Props = {
  snapshot: CodexRateLimitsSnapshot | null
  variant?: 'default' | 'compact'
  isRefreshing?: boolean
  onRefresh?: () => void
}

function formatWindowLabel(windowMinutes: number | null): string {
  if (windowMinutes == null) return '리밋'
  if (windowMinutes <= 60) return `${windowMinutes}분 리밋`
  if (windowMinutes < 60 * 24) {
    const hours = windowMinutes / 60
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}시간 리밋`
  }
  const days = windowMinutes / (60 * 24)
  if (Number.isInteger(days)) return `${days}일 리밋`
  return `${days.toFixed(1)}일 리밋`
}

function formatResetsAt(resetsAt: number | null): string {
  if (!resetsAt) return '—'
  const date = new Date(resetsAt * 1000)
  if (Number.isNaN(date.getTime())) return '—'
  const now = Date.now()
  const diffMs = date.getTime() - now
  const absMs = Math.abs(diffMs)
  const minutes = Math.round(absMs / 60000)
  let relative: string
  if (minutes < 1) relative = '곧'
  else if (minutes < 60) relative = `${minutes}분`
  else if (minutes < 60 * 24) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    relative = mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`
  } else {
    const days = Math.floor(minutes / (60 * 24))
    const hours = Math.floor((minutes % (60 * 24)) / 60)
    relative = hours > 0 ? `${days}일 ${hours}시간` : `${days}일`
  }
  const absolute = date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const suffix = diffMs >= 0 ? `${relative} 후 리셋` : `${relative} 전 리셋됨`
  return `${absolute} · ${suffix}`
}

function formatObservedAt(iso: string): string {
  try {
    const date = new Date(iso)
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return '—'
  }
}

function remainingPercent(used: number | null): number | null {
  if (used == null) return null
  return Math.max(0, Math.min(100, 100 - used))
}

function percentClass(remaining: number | null): string {
  if (remaining == null) return ''
  if (remaining <= 10) return 'danger'
  if (remaining <= 30) return 'warn'
  return ''
}

function formatTokenCount(value: number | null | undefined): string {
  if (value == null) return '—'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${Math.round(value / 1_000).toLocaleString('ko-KR')}K`
  return value.toLocaleString('ko-KR')
}

function formatUsageBreakdown(usage: CodexTokenUsage | null): string {
  if (!usage) return '—'
  const parts = [
    `입력 ${formatTokenCount(usage.inputTokens)}`,
    `캐시 ${formatTokenCount(usage.cachedInputTokens)}`,
    `출력 ${formatTokenCount(usage.outputTokens)}`,
    `추론 ${formatTokenCount(usage.reasoningOutputTokens)}`,
  ]
  return parts.join(' · ')
}

function formatSnapshotMeta(snapshot: CodexRateLimitsSnapshot | null, compact: boolean): string {
  if (!snapshot) return '세션 기록 대기 중'
  const plan = snapshot.planType ?? snapshot.limitId
  const credit =
    snapshot.credits?.unlimited ? '크레딧 무제한' : snapshot.credits?.balance ? `크레딧 ${snapshot.credits.balance}` : ''
  const observed = `데이터 ${formatObservedAt(snapshot.observedAt)}`
  const checked = `확인 ${formatObservedAt(snapshot.checkedAt ?? snapshot.observedAt)}`
  if (compact) return [plan, checked].filter(Boolean).join(' · ')
  return [plan, credit, observed, checked].filter(Boolean).join(' · ')
}

function RateLimitGauge({
  title,
  window: limitWindow,
  compact,
}: {
  title: string
  window: CodexRateLimitWindow | null
  compact: boolean
}) {
  if (!limitWindow) {
    return (
      <div className="rate-limit-row">
        <div className="rate-limit-head">
          <span className="rate-limit-title">{title}</span>
          <span className="rate-limit-muted">데이터 없음</span>
        </div>
      </div>
    )
  }
  const used = limitWindow.usedPercent
  const remaining = remainingPercent(used)
  const clamped = remaining ?? 0
  const label = formatWindowLabel(limitWindow.windowMinutes)
  return (
    <div className="rate-limit-row">
      <div className="rate-limit-head">
        <span className="rate-limit-title">
          {title} <span className="rate-limit-window">· {label}</span>
        </span>
        <span className={`rate-limit-percent ${percentClass(remaining)}`}>
          {remaining == null ? '—' : `${remaining.toFixed(1)}% 남음`}
        </span>
      </div>
      <div className="rate-limit-bar">
        <div
          className={`rate-limit-bar-fill ${percentClass(remaining)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {!compact && (
        <div className="rate-limit-foot">
          <span>
            사용됨: {used == null ? '—' : `${used.toFixed(1)}%`} · 리셋: {formatResetsAt(limitWindow.resetsAt)}
          </span>
        </div>
      )}
    </div>
  )
}

export function CodexRateLimitsPanel({
  snapshot,
  variant = 'default',
  isRefreshing = false,
  onRefresh,
}: Props) {
  const compact = variant === 'compact'

  return (
    <div className={`rate-limits-panel ${compact ? 'compact' : ''}`}>
      <div className="rate-limits-header">
        <h3>Codex 사용량</h3>
        <div className="rate-limits-actions">
          <span className="rate-limits-meta">{formatSnapshotMeta(snapshot, compact)}</span>
          {onRefresh && (
            <button
              type="button"
              className="rate-limits-refresh"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Codex 사용량 새로고침"
            >
              {isRefreshing ? '갱신 중' : '새로고침'}
            </button>
          )}
        </div>
      </div>
      {snapshot ? (
        <>
          <div className="rate-limits-token-summary">
            <div>
              <span>최근 요청</span>
              <strong>{formatTokenCount(snapshot.lastTokenUsage?.totalTokens)}</strong>
              {!compact && <small>{formatUsageBreakdown(snapshot.lastTokenUsage)}</small>}
            </div>
            <div>
              <span>세션 누적</span>
              <strong>{formatTokenCount(snapshot.totalTokenUsage?.totalTokens)}</strong>
              {!compact && <small>{formatUsageBreakdown(snapshot.totalTokenUsage)}</small>}
            </div>
            {!compact && (
              <div>
                <span>컨텍스트</span>
                <strong>{formatTokenCount(snapshot.modelContextWindow)}</strong>
                <small>모델 컨텍스트 윈도우</small>
              </div>
            )}
          </div>
          <div className="rate-limits-body">
            <RateLimitGauge title="5시간" window={snapshot.primary} compact={compact} />
            <RateLimitGauge title="7일" window={snapshot.secondary} compact={compact} />
          </div>
        </>
      ) : (
        <p className="rate-limits-empty">
          {compact
            ? 'Codex 세션 기록을 기다리는 중입니다.'
            : '아직 Codex 세션 기록이 없어 사용량을 계산할 수 없습니다. 분석을 한 번 실행하면 표시됩니다.'}
        </p>
      )}
    </div>
  )
}
