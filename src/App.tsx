import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import type { SyntheticEvent } from 'react'
import './App.css'
import type {
  AnalysisData,
  AnalysisEvent,
  AnalysisProgress,
  AnalysisVideo,
  AppEvent,
  EnvironmentStatus,
  FolderTreeNode,
  FolderVideoItem,
  ToolSettings,
} from './types'

const EMPTY_PROGRESS: AnalysisProgress = {
  exists: false,
  folderPath: '',
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

function VideoThumbnail({
  videoUrl,
  sampleImageUrl,
  title,
}: {
  videoUrl: string
  sampleImageUrl?: string
  title: string
}) {
  const handleLoadedMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    const element = event.currentTarget
    if (element.duration > 0 && element.currentTime === 0) {
      try {
        element.currentTime = Math.min(0.05, element.duration)
      } catch {
        // Keep the default first frame if seeking is blocked.
      }
    }
  }

  const handleFrameReady = (event: SyntheticEvent<HTMLVideoElement>) => {
    event.currentTarget.pause()
  }

  return (
    <div
      className={`video-thumb ${sampleImageUrl ? 'has-image' : 'has-video'}`}
      style={sampleImageUrl ? { backgroundImage: `url("${sampleImageUrl}")` } : undefined}
      aria-label={title}
    >
      {!sampleImageUrl && videoUrl && (
        <video
          key={videoUrl}
          className="video-thumb-player"
          src={videoUrl}
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleFrameReady}
          onSeeked={handleFrameReady}
        />
      )}
    </div>
  )
}

function FolderTreeBranch({
  node,
  depth,
  expandedPaths,
  selectedPath,
  onToggle,
  onSelect,
}: {
  node: FolderTreeNode
  depth: number
  expandedPaths: Set<string>
  selectedPath: string
  onToggle: (folderPath: string) => void
  onSelect: (folderPath: string) => void
}) {
  const hasChildren = node.children.length > 0
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = node.path === selectedPath
  const label = node.relativePath === '.' ? '기본 폴더' : node.name

  return (
    <div className="tree-branch">
      <div className={`tree-row ${isSelected ? 'selected' : ''}`}>
        <button
          className="tree-expander"
          type="button"
          onClick={() => hasChildren && onToggle(node.path)}
          disabled={!hasChildren}
          style={{ marginLeft: `${depth * 16}px` }}
          aria-label={hasChildren ? `${label} 펼치기/접기` : `${label} 하위 폴더 없음`}
        >
          {hasChildren ? (isExpanded ? '▾' : '▸') : '•'}
        </button>
        <button className="tree-label" type="button" onClick={() => onSelect(node.path)}>
          <strong>{label}</strong>
          <span>{node.relativePath}</span>
          <small>
            직접 {node.directVideoCount}개 · 전체 {node.totalVideoCount}개
          </small>
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children.map((child) => (
            <FolderTreeBranch
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function App() {
  const [settings, setSettings] = useState<ToolSettings | null>(null)
  const [draftSettings, setDraftSettings] = useState<ToolSettings | null>(null)
  const [environment, setEnvironment] = useState<EnvironmentStatus | null>(null)
  const [rootFolder, setRootFolder] = useState('')
  const [folderTree, setFolderTree] = useState<FolderTreeNode | null>(null)
  const [folderVideos, setFolderVideos] = useState<FolderVideoItem[]>([])
  const [selectedFolderPath, setSelectedFolderPath] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [progress, setProgress] = useState<AnalysisProgress>(EMPTY_PROGRESS)
  const [selectedVideoPath, setSelectedVideoPath] = useState('')
  const [searchText, setSearchText] = useState('')
  const [logLines, setLogLines] = useState<string[]>([])
  const [statusMessage, setStatusMessage] = useState('작업 공간을 준비하는 중입니다.')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [expandedFolderPaths, setExpandedFolderPaths] = useState<string[]>([])
  const deferredSearchText = useDeferredValue(searchText)

  const analyzeFolderPath = rootFolder
    ? `${rootFolder.replace(/[\\/]+$/, '')}${rootFolder.includes('\\') ? '\\' : '/'}analyze`
    : ''

  const analysisByPath = useMemo(() => {
    return new Map((analysis?.videos ?? []).map((video) => [video.absolutePath, video]))
  }, [analysis])

  const folderVideoByPath = useMemo(() => {
    return new Map(folderVideos.map((video) => [video.absolutePath, video]))
  }, [folderVideos])

  const expandedPathSet = useMemo(() => new Set(expandedFolderPaths), [expandedFolderPaths])

  const filteredAnalysisVideos = useMemo(() => {
    const query = deferredSearchText.trim().toLowerCase()

    return (analysis?.videos ?? []).filter((video) => {
      if (!query) {
        return true
      }

      const haystack = [
        video.title,
        video.summary,
        video.fileName,
        video.relativePath,
        ...video.details,
        ...video.categories,
        ...video.keywords,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [analysis, deferredSearchText])

  const selectedFolderNode = useMemo(() => {
    if (!folderTree || !selectedFolderPath) {
      return folderTree
    }

    return findTreeNode(folderTree, selectedFolderPath) ?? folderTree
  }, [folderTree, selectedFolderPath])

  const selectedAnalysisVideo = selectedVideoPath
    ? analysisByPath.get(selectedVideoPath) ?? null
    : null

  const selectedFolderVideo = selectedVideoPath
    ? folderVideoByPath.get(selectedVideoPath) ?? null
    : null

  const selectedVideo = selectedAnalysisVideo ?? selectedFolderVideo
  const selectedVideoIsAnalyzed = Boolean(selectedAnalysisVideo || selectedFolderVideo?.analyzed)

  const analyzedFolderVideoCount = folderVideos.filter((video) => video.analyzed).length
  const pendingFolderVideoCount = Math.max(folderVideos.length - analyzedFolderVideoCount, 0)

  const displayProgress = useMemo(() => {
    if (progress.exists) {
      return progress
    }

    return {
      ...EMPTY_PROGRESS,
      folderPath: selectedFolderPath,
      totalFiles: selectedFolderNode?.directVideoCount ?? folderVideos.length,
      pendingFiles: selectedFolderNode?.directVideoCount ?? folderVideos.length,
    }
  }, [folderVideos.length, progress, selectedFolderNode, selectedFolderPath])

  const refreshWorkspace = async (
    basePath = rootFolder,
    preferredFolderPath = selectedFolderPath || basePath,
    preserveSelectedVideo = true,
  ) => {
    if (!basePath) {
      return
    }

    setIsBusy(true)
    setErrorMessage('')

    try {
      const [loadedTree, loadedAnalysis, loadedProgress] = await Promise.all([
        window.codexVideoAnalyzer.loadFolderTree(basePath),
        window.codexVideoAnalyzer.loadAnalysis(basePath),
        window.codexVideoAnalyzer.loadAnalysisProgress(basePath),
      ])

      const nextFolderPath = pickFolderPath(loadedTree, preferredFolderPath || basePath)
      const loadedFolderVideos = nextFolderPath
        ? await window.codexVideoAnalyzer.loadFolderVideos(basePath, nextFolderPath)
        : []

      startTransition(() => {
        setFolderTree(loadedTree)
        setAnalysis(loadedAnalysis)
        setProgress(loadedProgress)
        setSelectedFolderPath(nextFolderPath)
        setFolderVideos(loadedFolderVideos)
        setExpandedFolderPaths((current) =>
          mergeExpandedFolderPaths(current, loadedTree, nextFolderPath),
        )
        setSelectedVideoPath((current) =>
          pickSelectedVideoPath(
            current,
            loadedAnalysis.videos,
            loadedFolderVideos,
            preserveSelectedVideo,
          ),
        )
      })

      if (loadedAnalysis.videos.length > 0) {
        setStatusMessage(`analyze에서 ${loadedAnalysis.videos.length}개 영상을 불러왔습니다.`)
      } else if (loadedFolderVideos.length > 0) {
        setStatusMessage(
          `${formatFolderPath(nextFolderPath, basePath)} 폴더의 영상 ${loadedFolderVideos.length}개를 불러왔습니다.`,
        )
      } else {
        setStatusMessage('아직 분석 결과가 없습니다. 하단 폴더에서 영상을 선택해 주세요.')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsBusy(false)
    }
  }

  const loadFolderVideosForPath = async (folderPath: string, preserveSelectedVideo = false) => {
    if (!rootFolder || !folderPath) {
      return
    }

    setIsBusy(true)
    setErrorMessage('')

    try {
      const loadedFolderVideos = await window.codexVideoAnalyzer.loadFolderVideos(
        rootFolder,
        folderPath,
      )

      startTransition(() => {
        setSelectedFolderPath(folderPath)
        setFolderVideos(loadedFolderVideos)
        setExpandedFolderPaths((current) =>
          mergeExpandedFolderPaths(current, folderTree, folderPath),
        )
        setSelectedVideoPath((current) =>
          pickSelectedVideoPath(
            current,
            analysis?.videos ?? [],
            loadedFolderVideos,
            preserveSelectedVideo,
          ),
        )
      })

      setStatusMessage(
        `${formatFolderPath(folderPath, rootFolder)} 폴더의 영상 ${loadedFolderVideos.length}개를 불러왔습니다.`,
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      try {
        const [loadedSettings, loadedEnvironment] = await Promise.all([
          window.codexVideoAnalyzer.getSettings(),
          window.codexVideoAnalyzer.getEnvironmentStatus(),
        ])

        if (cancelled) {
          return
        }

        setSettings(loadedSettings)
        setDraftSettings(loadedSettings)
        setEnvironment(loadedEnvironment)
        setRootFolder(loadedSettings.lastRootPath)
        setStatusMessage(
          loadedSettings.lastRootPath
            ? '기본 폴더를 불러오는 중입니다.'
            : '기본 폴더를 선택하면 작업 공간이 여기에 표시됩니다.',
        )
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : String(error))
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const unsubscribe = window.codexVideoAnalyzer.onAppEvent((event: AppEvent) => {
      if (event.type === 'base-folder-selected') {
        setSettings(event.settings)
        setDraftSettings(event.settings)
        setRootFolder(event.rootPath)
        setSearchText('')
        setErrorMessage('')
        setStatusMessage(`기본 폴더를 선택했습니다: ${event.rootPath}`)
      }
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!rootFolder) {
      startTransition(() => {
        setFolderTree(null)
        setFolderVideos([])
        setSelectedFolderPath('')
        setAnalysis(null)
        setProgress(EMPTY_PROGRESS)
        setSelectedVideoPath('')
        setExpandedFolderPaths([])
      })
      return
    }

    void refreshWorkspace(rootFolder, selectedFolderPath || rootFolder, true)
  }, [rootFolder])

  useEffect(() => {
    const unsubscribe = window.codexVideoAnalyzer.onAnalysisEvent(
      async (event: AnalysisEvent) => {
        if (event.type === 'started') {
          setIsAnalyzing(true)
          setLogLines([])
          setStatusMessage(`분석 시작: ${formatFolderPath(event.folderPath, rootFolder)}`)
          setErrorMessage('')
          setProgress(await window.codexVideoAnalyzer.loadAnalysisProgress(event.folderPath))
          return
        }

        if (event.type === 'log') {
          startTransition(() => {
            setLogLines((previous) =>
              [...previous, event.message.trimEnd()].filter(Boolean).slice(-500),
            )
          })
          return
        }

        if (event.type === 'completed') {
          setIsAnalyzing(false)
          await refreshWorkspace(event.folderPath, selectedFolderPath || event.folderPath, true)
          setStatusMessage(event.finalMessage || '분석이 완료되었습니다.')
          return
        }

        if (event.type === 'cancelled') {
          setIsAnalyzing(false)
          if (rootFolder) {
            await refreshWorkspace(rootFolder, selectedFolderPath || rootFolder, true)
          }
          setStatusMessage('분석을 취소했습니다.')
          return
        }

        if (event.type === 'failed') {
          setIsAnalyzing(false)
          if (rootFolder) {
            await refreshWorkspace(rootFolder, selectedFolderPath || rootFolder, true)
          }
          setErrorMessage([event.error, event.finalMessage].filter(Boolean).join('\n\n'))
          setStatusMessage('분석 중 오류가 발생했습니다.')
        }
      },
    )

    return unsubscribe
  }, [rootFolder, selectedFolderPath])

  useEffect(() => {
    if (!isAnalyzing || !rootFolder) {
      return undefined
    }

    let cancelled = false
    let timeoutId: number | undefined

    const poll = async () => {
      try {
        const nextProgress = await window.codexVideoAnalyzer.loadAnalysisProgress(rootFolder)
        if (!cancelled) {
          setProgress(nextProgress)
        }
      } catch {
        return
      }

      if (!cancelled) {
        timeoutId = window.setTimeout(poll, 1000)
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [isAnalyzing, rootFolder])

  const handleRefreshEnvironment = async () => {
    setIsBusy(true)
    setErrorMessage('')

    try {
      const nextSettings = draftSettings ?? settings ?? getFallbackSettings()
      const saved = await window.codexVideoAnalyzer.saveSettings(nextSettings)
      const refreshedEnvironment = await window.codexVideoAnalyzer.getEnvironmentStatus()

      setSettings(saved)
      setDraftSettings(saved)
      setEnvironment(refreshedEnvironment)
      setStatusMessage('도구 경로와 로그인 상태를 다시 점검했습니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsBusy(false)
    }
  }

  const handlePickRootFolder = async () => {
    setIsBusy(true)
    setErrorMessage('')

    try {
      const nextRootPath = await window.codexVideoAnalyzer.pickRootFolder()
      if (!nextRootPath) {
        return
      }

      const nextSettings = {
        ...(draftSettings ?? settings ?? getFallbackSettings()),
        lastRootPath: nextRootPath,
      }
      const saved = await window.codexVideoAnalyzer.saveSettings(nextSettings)

      setSettings(saved)
      setDraftSettings(saved)
      setRootFolder(nextRootPath)
      setSearchText('')
      setStatusMessage(`기본 폴더를 선택했습니다: ${nextRootPath}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsBusy(false)
    }
  }

  const handleAnalyzeSelectedFolder = async () => {
    if (!rootFolder || !selectedFolderPath) {
      return
    }

    setErrorMessage('')
    setStatusMessage(
      `Codex에 ${formatFolderPath(selectedFolderPath, rootFolder)} 폴더 분석을 요청했습니다.`,
    )

    try {
      await window.codexVideoAnalyzer.startAnalysis(selectedFolderPath)
    } catch (error) {
      setIsAnalyzing(false)
      setErrorMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const handleCancel = async () => {
    await window.codexVideoAnalyzer.cancelAnalysis()
  }

  const handleToggleFolder = (folderPath: string) => {
    setExpandedFolderPaths((current) => {
      const next = new Set(current)
      if (next.has(folderPath)) {
        next.delete(folderPath)
      } else {
        next.add(folderPath)
      }
      return [...next]
    })
  }

  return (
    <main className="app-shell">
      <section className="panel control-panel">
        <div className="control-header">
          <div>
            <p className="section-kicker">Workspace</p>
            <h1>기본 폴더 작업 공간</h1>
            <p className="path-copy">
              {rootFolder || '기본 폴더를 선택하면 analyze 결과와 하위 폴더 구조를 불러옵니다.'}
            </p>
          </div>

          <div className="action-group">
            <button className="ghost-button" onClick={handlePickRootFolder} disabled={isBusy}>
              기본 폴더 선택
            </button>
            <button
              className="ghost-button"
              onClick={() => rootFolder && window.codexVideoAnalyzer.showItemInFolder(rootFolder)}
              disabled={!rootFolder}
            >
              기본 폴더 열기
            </button>
            <button
              className="ghost-button"
              onClick={() =>
                analyzeFolderPath &&
                window.codexVideoAnalyzer.showItemInFolder(analyzeFolderPath)
              }
              disabled={!analyzeFolderPath}
            >
              analyze 열기
            </button>
            <button
              className="ghost-button"
              onClick={() => refreshWorkspace(rootFolder, selectedFolderPath || rootFolder, true)}
              disabled={!rootFolder || isBusy}
            >
              새로고침
            </button>
          </div>
        </div>

        <div className="tool-grid">
          <label className="field compact-field">
            <span>Codex 실행 파일</span>
            <input
              value={draftSettings?.codexCommand ?? ''}
              onChange={(event) =>
                setDraftSettings((current) => ({
                  ...(current ?? getFallbackSettings()),
                  codexCommand: event.target.value,
                }))
              }
              placeholder={environment?.settings.codexCommand ?? 'codex'}
            />
          </label>

          <label className="field compact-field">
            <span>ffmpeg 실행 파일</span>
            <input
              value={draftSettings?.ffmpegCommand ?? ''}
              onChange={(event) =>
                setDraftSettings((current) => ({
                  ...(current ?? getFallbackSettings()),
                  ffmpegCommand: event.target.value,
                }))
              }
              placeholder={environment?.settings.ffmpegCommand ?? 'ffmpeg'}
            />
          </label>

          <button className="primary-button save-button" onClick={handleRefreshEnvironment}>
            저장 및 점검
          </button>
        </div>

        <div className="status-strip">
          <span className={`status-pill-inline ${environment?.checks.codex.ok ? 'ok' : 'bad'}`}>
            Codex {environment?.checks.codex.ok ? '준비됨' : '확인 필요'}
          </span>
          <span
            className={`status-pill-inline ${
              environment?.checks.chatgptLogin.ok ? 'ok' : 'bad'
            }`}
          >
            로그인 {environment?.checks.chatgptLogin.ok ? '정상' : '필요'}
          </span>
          <span className={`status-pill-inline ${environment?.checks.ffmpeg.ok ? 'ok' : 'bad'}`}>
            ffmpeg {environment?.checks.ffmpeg.ok ? '준비됨' : '확인 필요'}
          </span>
          <span
            className={`status-pill-inline ${environment?.checks.ffprobe.ok ? 'ok' : 'bad'}`}
          >
            ffprobe {environment?.checks.ffprobe.ok ? '준비됨' : '확인 필요'}
          </span>
          <span className="status-pill-inline neutral">
            상태 {isAnalyzing ? '분석 중' : '대기 중'}
          </span>
          <span className="status-pill-inline neutral">
            선택 폴더 {formatFolderPath(selectedFolderPath, rootFolder)}
          </span>
        </div>

        <div className="progress-strip">
          <div>
            <p className="section-kicker">Progress</p>
            <strong>{formatProgressStatus(displayProgress.status)}</strong>
            <span>{statusMessage}</span>
          </div>
          <div className="progress-metrics">
            <span>전체 {displayProgress.totalFiles}개</span>
            <span>재사용 {displayProgress.reusableFiles}개</span>
            <span>신규 완료 {displayProgress.completedFiles}개</span>
            <span>남음 {displayProgress.pendingFiles}개</span>
            <span>{displayProgress.percent}%</span>
          </div>
          <div className="progress-bar" aria-hidden="true">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.max(0, Math.min(100, displayProgress.percent))}%` }}
            />
          </div>
        </div>

        {errorMessage && <div className="error-banner">{errorMessage}</div>}
      </section>

      <section className="top-workspace">
        <article className="panel analysis-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Analyze Library</p>
              <h2>분석된 영상 리스트</h2>
              <p className="section-note">
                analyze 폴더에서 읽은 영상 {analysis?.videos.length ?? 0}개
              </p>
            </div>
            <span className="count-chip">{filteredAnalysisVideos.length}개 표시</span>
          </div>

          <div className="filter-row">
            <input
              className="search-input"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="제목, 요약, 태그, 파일명으로 검색"
            />
            <button className="ghost-button" onClick={() => setSearchText('')}>
              검색 초기화
            </button>
          </div>

          <div className="video-list analysis-list">
            {filteredAnalysisVideos.map((video) => (
              <button
                key={video.absolutePath}
                className={`video-card ${
                  video.absolutePath === selectedVideoPath ? 'active' : ''
                }`}
                onClick={() => setSelectedVideoPath(video.absolutePath)}
              >
                <VideoThumbnail
                  videoUrl={video.videoUrl}
                  sampleImageUrl={video.sampleImageUrl}
                  title={video.title}
                />

                <div className="video-card-body">
                  <div className="video-card-top">
                    <strong>{video.title}</strong>
                    <span className="status-badge analyzed">분석됨</span>
                  </div>
                  <span>{video.relativePath}</span>
                  <p>{video.summary}</p>
                  <div className="pill-row">
                    {video.categories.slice(0, 3).map((category) => (
                      <span key={`${video.absolutePath}-${category}`} className="mini-pill">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}

            {filteredAnalysisVideos.length === 0 && (
              <div className="empty-card">
                {analysis?.videos.length
                  ? '검색 조건에 맞는 분석 결과가 없습니다.'
                  : 'analyze 폴더에 읽을 수 있는 분석 결과가 아직 없습니다.'}
              </div>
            )}
          </div>
        </article>

        <article className="panel viewer-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Selected Video</p>
              <h2>{selectedVideo?.title || selectedVideo?.fileName || '영상 정보'}</h2>
            </div>
            <div className="action-group">
              {selectedVideo && (
                <span className={`status-badge ${selectedVideoIsAnalyzed ? 'analyzed' : 'pending'}`}>
                  {selectedVideoIsAnalyzed ? '분석됨' : '미분석'}
                </span>
              )}
              <button
                className="ghost-button"
                disabled={!selectedVideo}
                onClick={() =>
                  selectedVideo &&
                  window.codexVideoAnalyzer.showItemInFolder(selectedVideo.absolutePath)
                }
              >
                파일 위치
              </button>
              <button
                className="ghost-button"
                disabled={!selectedVideo}
                onClick={() =>
                  selectedVideo &&
                  window.codexVideoAnalyzer.openPath(selectedVideo.absolutePath)
                }
              >
                외부 앱으로 열기
              </button>
              <button
                className="ghost-button"
                disabled={!selectedAnalysisVideo}
                onClick={() =>
                  selectedAnalysisVideo &&
                  window.codexVideoAnalyzer.openPath(selectedAnalysisVideo.analysisFilePath)
                }
              >
                Markdown 열기
              </button>
            </div>
          </div>

          {selectedVideo ? (
            <>
              <video
                key={selectedAnalysisVideo?.videoUrl || selectedFolderVideo?.videoUrl || ''}
                className="video-player"
                src={selectedAnalysisVideo?.videoUrl || selectedFolderVideo?.videoUrl || ''}
                controls
                playsInline
                preload="metadata"
              />

              <div className="selected-meta-grid">
                <div className="meta-card">
                  <span>경로</span>
                  <strong>{selectedAnalysisVideo?.relativePath || selectedFolderVideo?.relativePath}</strong>
                </div>
                <div className="meta-card">
                  <span>길이</span>
                  <strong>{formatDuration(selectedVideo.durationSeconds)}</strong>
                </div>
                <div className="meta-card">
                  <span>해상도</span>
                  <strong>{formatResolution(selectedVideo.width, selectedVideo.height)}</strong>
                </div>
                <div className="meta-card">
                  <span>오디오</span>
                  <strong>{selectedVideo.hasAudio == null ? '-' : selectedVideo.hasAudio ? '있음' : '없음'}</strong>
                </div>
              </div>

              <div className="detail-block">
                <p className="detail-label">요약</p>
                <p className="summary-copy">
                  {selectedVideoIsAnalyzed
                    ? selectedAnalysisVideo?.summary
                    : '이 영상은 아직 analyze 결과가 없습니다. 하단 폴더 영역에서 선택한 폴더를 분석하면 여기에서 요약과 태그를 볼 수 있습니다.'}
                </p>
              </div>

              {selectedAnalysisVideo ? (
                <>
                  <div className="detail-block">
                    <p className="detail-label">세부 설명</p>
                    <ul className="detail-list">
                      {selectedAnalysisVideo.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="detail-block">
                    <p className="detail-label">태그</p>
                    <div className="pill-row">
                      {[...selectedAnalysisVideo.categories, ...selectedAnalysisVideo.keywords].map(
                        (tag) => (
                          <button
                            key={`${selectedAnalysisVideo.absolutePath}-${tag}`}
                            className="mini-pill clickable"
                            onClick={() => setSearchText(tag)}
                          >
                            {tag}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="detail-block">
                  <p className="detail-label">상태</p>
                  <p className="summary-copy">
                    선택한 파일명은 <strong>{selectedFolderVideo?.fileName}</strong>입니다. 현재는
                    폴더 내 원본 영상만 불러온 상태입니다.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="empty-card viewer-empty">
              상단 분석 리스트나 하단 폴더 영상 리스트에서 영상을 선택하면 여기에서 바로 재생됩니다.
            </div>
          )}
        </article>
      </section>

      <section className="bottom-workspace">
        <article className="panel tree-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Folder Tree</p>
              <h2>기본 폴더 하위 구조</h2>
              <p className="section-note">
                선택한 폴더의 직접 포함 영상만 오른쪽 목록에 표시됩니다.
              </p>
            </div>
          </div>

          {folderTree ? (
            <div className="tree-panel-body">
              <FolderTreeBranch
                node={folderTree}
                depth={0}
                expandedPaths={expandedPathSet}
                selectedPath={selectedFolderPath}
                onToggle={handleToggleFolder}
                onSelect={(folderPath) => void loadFolderVideosForPath(folderPath, false)}
              />
            </div>
          ) : (
            <div className="empty-card">기본 폴더를 선택하면 폴더 트리가 표시됩니다.</div>
          )}
        </article>

        <article className="panel folder-videos-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Folder Videos</p>
              <h2>{formatFolderPath(selectedFolderPath, rootFolder)}</h2>
              <p className="section-note">
                영상 {folderVideos.length}개 · 분석됨 {analyzedFolderVideoCount}개 · 미분석{' '}
                {pendingFolderVideoCount}개
              </p>
            </div>

            <div className="action-group">
              {isAnalyzing ? (
                <button className="danger-button" onClick={handleCancel}>
                  분석 취소
                </button>
              ) : (
                <button
                  className="primary-button"
                  onClick={handleAnalyzeSelectedFolder}
                  disabled={
                    !selectedFolderPath ||
                    isBusy ||
                    (selectedFolderNode?.directVideoCount ?? folderVideos.length) === 0
                  }
                >
                  선택 폴더 분석
                </button>
              )}
            </div>
          </div>

          <div className="video-list folder-video-list">
            {folderVideos.map((video) => (
              <button
                key={video.absolutePath}
                className={`video-card ${
                  video.absolutePath === selectedVideoPath ? 'active' : ''
                }`}
                onClick={() => setSelectedVideoPath(video.absolutePath)}
              >
                <VideoThumbnail
                  videoUrl={video.videoUrl}
                  sampleImageUrl={video.sampleImageUrl}
                  title={video.title}
                />

                <div className="video-card-body">
                  <div className="video-card-top">
                    <strong>{video.analyzed ? video.title : video.fileName}</strong>
                    <span className={`status-badge ${video.analyzed ? 'analyzed' : 'pending'}`}>
                      {video.analyzed ? '분석됨' : '미분석'}
                    </span>
                  </div>
                  <span>{video.relativePath}</span>
                  <p>
                    {video.analyzed
                      ? video.summary
                      : '아직 analyze 결과가 없습니다. 폴더 분석을 실행하면 요약과 태그가 채워집니다.'}
                  </p>
                </div>
              </button>
            ))}

            {folderVideos.length === 0 && (
              <div className="empty-card">선택한 폴더에 직접 들어 있는 영상이 없습니다.</div>
            )}
          </div>
        </article>
      </section>

      <section className="panel console-panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Run Log</p>
            <h2>실행 로그</h2>
          </div>
          <span className="status-inline">{statusMessage}</span>
        </div>

        <pre className="console-output">
          {logLines.length > 0
            ? logLines.join('\n')
            : '아직 실행 로그가 없습니다. 폴더 분석을 시작하면 Codex 출력이 여기에 표시됩니다.'}
        </pre>
      </section>
    </main>
  )
}

function findTreeNode(node: FolderTreeNode, targetPath: string): FolderTreeNode | null {
  if (node.path === targetPath) {
    return node
  }

  for (const child of node.children) {
    const match = findTreeNode(child, targetPath)
    if (match) {
      return match
    }
  }

  return null
}

function findAncestorPaths(node: FolderTreeNode, targetPath: string): string[] {
  if (node.path === targetPath) {
    return [node.path]
  }

  for (const child of node.children) {
    const childPaths = findAncestorPaths(child, targetPath)
    if (childPaths.length > 0) {
      return [node.path, ...childPaths]
    }
  }

  return []
}

function pickFolderPath(tree: FolderTreeNode | null, preferredFolderPath: string): string {
  if (!tree) {
    return ''
  }

  if (!preferredFolderPath) {
    return tree.path
  }

  return findTreeNode(tree, preferredFolderPath)?.path ?? tree.path
}

function mergeExpandedFolderPaths(
  currentPaths: string[],
  tree: FolderTreeNode | null,
  selectedFolderPath: string,
): string[] {
  if (!tree) {
    return []
  }

  const next = new Set(currentPaths)
  for (const path of findAncestorPaths(tree, selectedFolderPath || tree.path)) {
    next.add(path)
  }
  next.add(tree.path)
  return [...next]
}

function pickSelectedVideoPath(
  currentPath: string,
  analysisVideos: AnalysisVideo[],
  folderVideos: FolderVideoItem[],
  preserveSelectedVideo: boolean,
) {
  if (
    preserveSelectedVideo &&
    currentPath &&
    (analysisVideos.some((video) => video.absolutePath === currentPath) ||
      folderVideos.some((video) => video.absolutePath === currentPath))
  ) {
    return currentPath
  }

  return folderVideos[0]?.absolutePath ?? analysisVideos[0]?.absolutePath ?? ''
}

function formatFolderPath(folderPath: string, rootFolder: string) {
  if (!folderPath) {
    return '폴더를 선택하세요'
  }

  if (!rootFolder || folderPath === rootFolder) {
    return '기본 폴더'
  }

  const relativePath = folderPath.startsWith(rootFolder)
    ? folderPath.slice(rootFolder.length).replace(/^[\\/]+/, '')
    : folderPath

  return relativePath || '기본 폴더'
}

function formatProgressStatus(status: string) {
  switch (status) {
    case 'running':
      return '분석 진행 중'
    case 'completed':
      return '분석 완료'
    case 'failed':
      return '실패'
    case 'cancelled':
      return '취소됨'
    default:
      return '대기 중'
  }
}

function formatDuration(durationSeconds?: number) {
  if (durationSeconds == null) {
    return '-'
  }

  return `${durationSeconds.toFixed(1)}초`
}

function formatResolution(width?: number, height?: number) {
  if (!width || !height) {
    return '-'
  }

  return `${width}×${height}`
}

function getFallbackSettings(): ToolSettings {
  return {
    codexCommand: 'codex',
    ffmpegCommand: 'ffmpeg',
    lastRootPath: '',
  }
}

export default App
