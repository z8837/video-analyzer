import type { DragEvent, RefObject } from 'react'
import { KeywordJumpSection } from '../components/KeywordJumpSection'
import { LibraryVideoCard } from '../components/LibraryVideoCard'
import type { AnalysisData, AnalysisVideo, KeywordMoment } from '../types'

type AnalysisLibraryPageProps = {
  analysis: AnalysisData | null
  filteredAnalysisVideos: AnalysisVideo[]
  searchInput: string
  searchFilters: string[]
  librarySelectedVideoPath: string
  librarySelectedVideo: AnalysisVideo | null | undefined
  rootFolder: string
  gridRef: RefObject<HTMLDivElement | null>
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
  searchInput,
  searchFilters,
  librarySelectedVideoPath,
  librarySelectedVideo,
  rootFolder,
  gridRef,
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
          {filteredAnalysisVideos.map((video) => (
            <LibraryVideoCard
              key={video.absolutePath}
              video={video}
              isActive={video.absolutePath === librarySelectedVideoPath}
              durationText={formatDuration(video.durationSeconds)}
              onSelect={onSelectVideo}
              onDragStart={onVideoFileDragStart}
            />
          ))}

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

            <KeywordJumpSection
              video={librarySelectedVideo}
              keywordMoments={getKeywordJumpTargets(librarySelectedVideo)}
              formatDuration={formatDuration}
              onJump={onJumpToKeyword}
            />

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
