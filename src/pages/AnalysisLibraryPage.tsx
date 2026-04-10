import type { DragEvent, RefObject } from 'react'
import { VideoThumbnail } from '../components/VideoThumbnail'
import type { AnalysisData, AnalysisVideo, KeywordMoment } from '../types'

type AnalysisLibraryPageProps = {
  analysis: AnalysisData | null
  filteredAnalysisVideos: AnalysisVideo[]
  visibleVideos: AnalysisVideo[]
  visibleCount: number
  searchInput: string
  searchFilters: string[]
  librarySelectedVideoPath: string
  librarySelectedVideo: AnalysisVideo | null | undefined
  rootFolder: string
  gridRef: RefObject<HTMLDivElement | null>
  sentinelRef: RefObject<HTMLDivElement | null>
  libraryPlayerRef: RefObject<HTMLVideoElement | null>
  onSearchInputChange: (value: string) => void
  onAddSearchFilter: (text: string) => void
  onRemoveSearchFilter: (filter: string) => void
  onClearSearchFilters: () => void
  onSelectVideo: (absolutePath: string) => void
  onVideoFileDragStart: (event: DragEvent<HTMLButtonElement>, filePath: string, iconPath?: string) => void
  onShowItemInFolder: (targetPath: string) => void
  onJumpToKeyword: (video: AnalysisVideo, keywordMoment: KeywordMoment) => void
  formatDuration: (durationSeconds?: number) => string
  formatVideoFolderPath: (absolutePath: string, rootFolder: string) => string
  getKeywordJumpTargets: (video: AnalysisVideo) => KeywordMoment[]
}

export function AnalysisLibraryPage({
  analysis,
  filteredAnalysisVideos,
  visibleVideos,
  visibleCount,
  searchInput,
  searchFilters,
  librarySelectedVideoPath,
  librarySelectedVideo,
  rootFolder,
  gridRef,
  sentinelRef,
  libraryPlayerRef,
  onSearchInputChange,
  onAddSearchFilter,
  onRemoveSearchFilter,
  onClearSearchFilters,
  onSelectVideo,
  onVideoFileDragStart,
  onShowItemInFolder,
  onJumpToKeyword,
  formatDuration,
  formatVideoFolderPath,
  getKeywordJumpTargets,
}: AnalysisLibraryPageProps) {
  return (
    <div className="library-view">
      <section className="library-content">
        <div className="content-header">
          <div className="library-stats">
            <span className="stats-label">분석된 영상</span>
            <span className="stats-count">{filteredAnalysisVideos.length}</span>
            {searchFilters.length > 0 && (
              <span className="stats-total">/ {analysis?.videos.length ?? 0}</span>
            )}
          </div>
          <div className="filter-row">
            <input
              className="search-input"
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  onAddSearchFilter(searchInput)
                }
              }}
              placeholder="검색어 입력 후 Enter"
            />
            <button className="ghost-button small filter-clear-btn" onClick={onClearSearchFilters}>
              초기화
            </button>
          </div>
          {searchFilters.length > 0 && (
            <div className="filter-chips">
              {searchFilters.map((filter) => (
                <button
                  key={filter}
                  className="filter-chip"
                  onClick={() => onRemoveSearchFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="library-grid" ref={gridRef}>
          {visibleVideos.map((video) => (
            <button
              key={video.absolutePath}
              className={`lib-card ${video.absolutePath === librarySelectedVideoPath ? 'active' : ''}`}
              type="button"
              draggable
              onClick={() => onSelectVideo(video.absolutePath)}
              onDragStart={(event) =>
                onVideoFileDragStart(event, video.absolutePath, video.sampleImagePath)
              }
            >
              <VideoThumbnail
                videoUrl={video.videoUrl}
                sampleImageUrl={video.sampleImageUrl}
                title={video.title}
                badgeText={video.fileName}
                badgeVariant="filename"
                durationText={formatDuration(video.durationSeconds)}
              />
              <div className="lib-card-body">
                <strong>{video.title}</strong>
                <span className="lib-card-meta">
                  {video.relativePath.includes('/')
                    ? `${video.relativePath.substring(0, video.relativePath.lastIndexOf('/'))}/`
                    : './'}
                </span>
                {video.keywords.length > 0 ? (
                  <div className="pill-row">
                    {video.keywords.slice(0, 4).map((keyword) => (
                      <span key={`${video.absolutePath}-${keyword}`} className="mini-pill">
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="lib-card-empty-keywords">키워드 없음</span>
                )}
              </div>
            </button>
          ))}

          {visibleCount < filteredAnalysisVideos.length && (
            <div ref={sentinelRef} className="library-sentinel" />
          )}

          {filteredAnalysisVideos.length === 0 && (
            <div className="empty-card">
              {analysis?.videos.length
                ? '검색 조건에 맞는 분석 결과가 없습니다.'
                : '아직 분석된 영상이 없습니다. 폴더 탐색에서 분석을 시작해 주세요.'}
            </div>
          )}
        </div>
      </section>

      <aside className="detail-pane panel">
        {librarySelectedVideo ? (
          <>
            <video
              key={librarySelectedVideo.videoUrl}
              ref={libraryPlayerRef}
              className="detail-player"
              src={librarySelectedVideo.videoUrl}
              controls
              playsInline
              preload="metadata"
            />

            <div className="detail-header">
              <div className="detail-header-text">
                <h2>{librarySelectedVideo.title}</h2>
                <p className="detail-file-name">{librarySelectedVideo.fileName}</p>
              </div>
              <button
                className="ghost-button small"
                onClick={() => onShowItemInFolder(librarySelectedVideo.absolutePath)}
              >
                파일 위치
              </button>
            </div>
            <div className="detail-inline-meta">
              <span className="detail-relative-path">
                {formatVideoFolderPath(librarySelectedVideo.absolutePath, rootFolder)}
              </span>
              <span className="detail-duration-chip">
                {formatDuration(librarySelectedVideo.durationSeconds)}
              </span>
            </div>

            <div className="detail-section">
              <div className="detail-section-head">
                <h3>키워드 점프</h3>
                {librarySelectedVideo.keywordMoments.length === 0 &&
                  librarySelectedVideo.keywords.length > 0 && (
                    <span className="detail-section-note">시간 정보 없음</span>
                  )}
              </div>
              <div className="pill-row">
                {getKeywordJumpTargets(librarySelectedVideo).length > 0 ? (
                  getKeywordJumpTargets(librarySelectedVideo).map((keywordMoment) =>
                    keywordMoment.timeSeconds != null ? (
                      <button
                        key={`${librarySelectedVideo.absolutePath}-${keywordMoment.label}-${keywordMoment.timeSeconds}`}
                        type="button"
                        className="mini-pill clickable jump-pill"
                        onClick={() => onJumpToKeyword(librarySelectedVideo, keywordMoment)}
                      >
                        <span>{keywordMoment.label}</span>
                        <span className="jump-pill-time">
                          {formatDuration(keywordMoment.timeSeconds)}
                        </span>
                      </button>
                    ) : (
                      <span
                        key={`${librarySelectedVideo.absolutePath}-${keywordMoment.label}`}
                        className="mini-pill"
                      >
                        {keywordMoment.label}
                      </span>
                    ),
                  )
                ) : (
                  <span className="mini-pill">키워드 없음</span>
                )}
              </div>
              {librarySelectedVideo.keywords.length > 0 &&
                librarySelectedVideo.keywordMoments.length === 0 && (
                  <p className="muted">
                    기존 분석 결과에는 키워드 시점 정보가 없습니다. 다시 분석하면 바로 점프할 수 있습니다.
                  </p>
                )}
            </div>

            <div className="detail-section">
              <h3>요약</h3>
              <p>{librarySelectedVideo.summary}</p>
            </div>

            <div className="detail-section">
              <h3>세부 설명</h3>
              <ul>
                {librarySelectedVideo.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>

            <div className="detail-section">
              <h3>카테고리</h3>
              <div className="pill-row">
                {librarySelectedVideo.categories.length > 0 ? (
                  librarySelectedVideo.categories.map((tag) => (
                    <button
                      key={`${librarySelectedVideo.absolutePath}-${tag}`}
                      type="button"
                      className="mini-pill clickable"
                      onClick={() => onAddSearchFilter(tag)}
                    >
                      {tag}
                    </button>
                  ))
                ) : (
                  <span className="mini-pill">카테고리 없음</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="empty-card detail-empty">
            분석된 영상을 선택하면 상세 정보가 여기에 표시됩니다.
          </div>
        )}
      </aside>
    </div>
  )
}
