import { useEffect, useRef } from 'react'
import type { DragEvent, RefObject } from 'react'
import { FolderTreeBranch } from '../components/FolderTreeBranch'
import { KeywordJumpSection } from '../components/KeywordJumpSection'
import { VideoThumbnail } from '../components/VideoThumbnail'
import type { AnalysisVideo, FolderTreeNode, FolderVideoItem, KeywordMoment } from '../types'

type FolderExplorerPageProps = {
  folderTree: FolderTreeNode | null
  expandedPathSet: Set<string>
  selectedFolderPath: string
  selectedFolderNode: FolderTreeNode | null | undefined
  folderVideos: FolderVideoItem[]
  folderSelectedVideoPath: string
  folderSelectedVideo: FolderVideoItem | null | undefined
  folderSelectedAnalysis: AnalysisVideo | null | undefined
  folderSelectedIsAnalyzed: boolean
  rootFolder: string
  analyzedFolderVideoCount: number
  pendingFolderVideoCount: number
  isAnalyzing: boolean
  isBusy: boolean
  analysisPrerequisitesReady: boolean
  folderPlayerRef: RefObject<HTMLVideoElement | null>
  onToggleFolder: (folderPath: string) => void
  onSelectFolder: (folderPath: string) => void
  onRefresh: () => void
  onCancel: () => void
  onAnalyzeSelectedFolder: () => void
  onSelectVideo: (absolutePath: string) => void
  onVideoFileDragStart: (event: DragEvent<HTMLButtonElement>, filePath: string, iconPath?: string) => void
  onShowItemInFolder: (targetPath: string) => void
  onJumpToKeyword: (video: AnalysisVideo, keywordMoment: KeywordMoment) => void
  formatFolderPath: (folderPath: string, rootFolder: string) => string
  formatDuration: (durationSeconds?: number) => string
  formatVideoFolderPath: (absolutePath: string, rootFolder: string) => string
  getKeywordJumpTargets: (video: AnalysisVideo) => KeywordMoment[]
}

export function FolderExplorerPage({
  folderTree,
  expandedPathSet,
  selectedFolderPath,
  selectedFolderNode,
  folderVideos,
  folderSelectedVideoPath,
  folderSelectedVideo,
  folderSelectedAnalysis,
  folderSelectedIsAnalyzed,
  rootFolder,
  analyzedFolderVideoCount,
  pendingFolderVideoCount,
  isAnalyzing,
  isBusy,
  analysisPrerequisitesReady,
  folderPlayerRef,
  onToggleFolder,
  onSelectFolder,
  onRefresh,
  onCancel,
  onAnalyzeSelectedFolder,
  onSelectVideo,
  onVideoFileDragStart,
  onShowItemInFolder,
  onJumpToKeyword,
  formatFolderPath,
  formatDuration,
  formatVideoFolderPath,
  getKeywordJumpTargets,
}: FolderExplorerPageProps) {
  const videoGridRef = useRef<HTMLDivElement>(null)
  const detailPaneRef = useRef<HTMLElement>(null)
  const selectedVideo = folderSelectedVideo ?? folderSelectedAnalysis

  useEffect(() => {
    videoGridRef.current?.scrollTo({ top: 0, behavior: 'auto' })
    detailPaneRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [selectedFolderPath])

  useEffect(() => {
    detailPaneRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [folderSelectedVideoPath])

  return (
    <div className="folder-view">
      <aside className="folder-tree-pane panel">
        <div className="pane-header">
          <h2>폴더 구조</h2>
          <div className="action-group">
            <button
              className="ghost-button small"
              onClick={() => rootFolder && onShowItemInFolder(rootFolder)}
              disabled={!rootFolder}
            >
              열기
            </button>
            <button
              className="ghost-button small"
              onClick={onRefresh}
              disabled={!rootFolder || isBusy}
            >
              새로고침
            </button>
          </div>
        </div>

        {rootFolder && <p className="root-path">{rootFolder}</p>}

        {folderTree ? (
          <div className="tree-scroll">
            <FolderTreeBranch
              node={folderTree}
              depth={0}
              expandedPaths={expandedPathSet}
              selectedPath={selectedFolderPath}
              onToggle={onToggleFolder}
              onSelect={onSelectFolder}
            />
          </div>
        ) : (
          <div className="empty-card">기본 폴더를 선택하면 폴더 트리가 표시됩니다.</div>
        )}

        <div className="analyze-action">
          {isAnalyzing ? (
            <button className="danger-button full-width" onClick={onCancel}>
              분석 취소
            </button>
          ) : (
            <button
              className="primary-button full-width"
              onClick={onAnalyzeSelectedFolder}
              disabled={
                !selectedFolderPath ||
                isBusy ||
                (selectedFolderNode?.directVideoCount ?? folderVideos.length) === 0 ||
                !analysisPrerequisitesReady
              }
            >
              선택 폴더 분석
            </button>
          )}
        </div>
      </aside>

      <section className="folder-content">
        <div className="content-header">
          <div>
            <h1>{formatFolderPath(selectedFolderPath, rootFolder)}</h1>
            <p className="content-subtitle">
              영상 {folderVideos.length}개 · 분석됨 {analyzedFolderVideoCount}개 · 미분석{' '}
              {pendingFolderVideoCount}개
            </p>
          </div>
        </div>

        <div className="video-grid" ref={videoGridRef}>
          {folderVideos.map((video) => (
            <button
              key={video.absolutePath}
              className={`video-card ${video.absolutePath === folderSelectedVideoPath ? 'active' : ''}`}
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
                durationText={formatDuration(video.durationSeconds)}
              />
              <div className="video-card-body">
                <div className="video-card-top">
                  <strong>{video.title}</strong>
                  <span className={`status-badge ${video.analyzed ? 'analyzed' : 'pending'}`}>
                    {video.analyzed ? '분석됨' : '미분석'}
                  </span>
                </div>
                <span className="video-card-file-name">{video.fileName}</span>
                <p>{video.analyzed ? video.summary : '아직 분석 결과가 없습니다.'}</p>
              </div>
            </button>
          ))}

          {folderVideos.length === 0 && (
            <div className="empty-card">영상이 없습니다.</div>
          )}
        </div>
      </section>

      <aside ref={detailPaneRef} className="detail-pane panel">
        {selectedVideo ? (
          <>
            <video
              key={folderSelectedAnalysis?.videoUrl || folderSelectedVideo?.videoUrl || ''}
              ref={folderPlayerRef}
              className="detail-player"
              src={folderSelectedAnalysis?.videoUrl || folderSelectedVideo?.videoUrl || ''}
              controls
              playsInline
              preload="metadata"
            />

            <div className="detail-header">
              <div className="detail-header-text">
                <h2>{selectedVideo.title || selectedVideo.fileName || '영상 정보'}</h2>
                <p className="detail-file-name">{selectedVideo.fileName}</p>
              </div>
              <button
                className="ghost-button small"
                onClick={() => onShowItemInFolder(selectedVideo.absolutePath)}
              >
                파일 위치
              </button>
            </div>
            <div className="detail-inline-meta">
              <span className="detail-relative-path">
                {formatVideoFolderPath(selectedVideo.absolutePath, rootFolder)}
              </span>
              <span className="detail-duration-chip">
                {formatDuration(selectedVideo.durationSeconds)}
              </span>
            </div>

            {folderSelectedIsAnalyzed && folderSelectedAnalysis ? (
              <>
                <KeywordJumpSection
                  video={folderSelectedAnalysis}
                  keywordMoments={getKeywordJumpTargets(folderSelectedAnalysis)}
                  formatDuration={formatDuration}
                  onJump={onJumpToKeyword}
                />
                <div className="detail-section">
                  <h3>요약</h3>
                  <p>{folderSelectedAnalysis.summary}</p>
                </div>
                <div className="detail-section">
                  <h3>세부 설명</h3>
                  <ul>
                    {folderSelectedAnalysis.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </div>
                <div className="detail-section">
                  <h3>카테고리</h3>
                  <div className="pill-row">
                    {folderSelectedAnalysis.categories.length > 0 ? (
                      folderSelectedAnalysis.categories.map((tag) => (
                        <span key={`${folderSelectedAnalysis.absolutePath}-${tag}`} className="mini-pill">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="mini-pill">카테고리 없음</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="detail-section">
                <p className="muted">이 영상은 아직 분석되지 않았습니다.</p>
              </div>
            )}
          </>
        ) : (
          <div className="empty-card detail-empty">
            영상을 선택하면 상세 정보가 여기에 표시됩니다.
          </div>
        )}
      </aside>
    </div>
  )
}
