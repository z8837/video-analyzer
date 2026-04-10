import type { AnalysisVideo, KeywordMoment } from '../types'

type KeywordJumpSectionProps = {
  video: AnalysisVideo
  keywordMoments: KeywordMoment[]
  formatDuration: (durationSeconds?: number) => string
  onJump: (video: AnalysisVideo, keywordMoment: KeywordMoment) => void
}

export function KeywordJumpSection({
  video,
  keywordMoments,
  formatDuration,
  onJump,
}: KeywordJumpSectionProps) {
  const jumpable = keywordMoments.filter((keywordMoment) => keywordMoment.timeSeconds != null)
  const nonJumpable = keywordMoments.filter((keywordMoment) => keywordMoment.timeSeconds == null)

  return (
    <div className="detail-section">
      <div className="detail-section-head">
        <h3>키워드 점프</h3>
        <span className="detail-section-note">
          {jumpable.length > 0 ? `${jumpable.length}개 시점` : '시점 정보 없음'}
        </span>
      </div>

      {jumpable.length > 0 ? (
        <div className="keyword-jump-chips">
          {jumpable.map((keywordMoment) => {
            const time = keywordMoment.timeSeconds ?? 0
            return (
              <button
                key={`${video.absolutePath}-${keywordMoment.label}-${time}`}
                type="button"
                className="keyword-jump-chip"
                onClick={() => onJump(video, keywordMoment)}
                title={`${formatDuration(time)} · ${keywordMoment.label}`}
              >
                <span className="keyword-jump-chip-time">{formatDuration(time)}</span>
                <span className="keyword-jump-chip-label">{keywordMoment.label}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      {nonJumpable.length > 0 ? (
        <div className="keyword-jump-extra">
          <span className="keyword-jump-extra-label">시점 정보 없음</span>
          <div className="pill-row">
            {nonJumpable.map((keywordMoment) => (
              <span
                key={`${video.absolutePath}-no-time-${keywordMoment.label}`}
                className="mini-pill"
              >
                {keywordMoment.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {jumpable.length === 0 && nonJumpable.length === 0 ? (
        <p className="muted">키워드가 없습니다.</p>
      ) : null}

      {jumpable.length === 0 && nonJumpable.length > 0 ? (
        <p className="muted">
          기존 분석 결과에는 키워드 시점 정보가 없습니다. 다시 분석하면 바로 점프할 수 있습니다.
        </p>
      ) : null}
    </div>
  )
}
