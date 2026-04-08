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

type ViewMode = 'folders' | 'library'

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
  const [viewMode, setViewMode] = useState<ViewMode>('folders')
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
  const [showSettings, setShowSettings] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const deferredSearchText = useDeferredValue(searchText)

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
  const analysisPrerequisitesReady = areAnalysisPrerequisitesReady(environment)

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
        setStatusMessage(`${loadedAnalysis.videos.length}개 분석 결과를 불러왔습니다.`)
      } else if (loadedFolderVideos.length > 0) {
        setStatusMessage(
          `${formatFolderPath(nextFolderPath, basePath)} 폴더의 영상 ${loadedFolderVideos.length}개를 불러왔습니다.`,
        )
      } else {
        setStatusMessage('아직 분석 결과가 없습니다.')
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
          setShowLog(true)
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
    setStatusMessage('도구 경로를 저장하고 필요한 구성요소를 준비하는 중입니다.')

    try {
      const nextSettings = draftSettings ?? settings ?? getFallbackSettings()
      const prepared = await window.codexVideoAnalyzer.prepareEnvironment(nextSettings)

      setSettings(prepared.settings)
      setDraftSettings(prepared.settings)
      setEnvironment(prepared.environment)
      setErrorMessage(prepared.issues.join('\n'))
      setStatusMessage(prepared.message)
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
    <div className="app-shell">
      {/* ── 사이드바 ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">▶</span>
          <div>
            <strong>영상 분석기</strong>
            <small>로컬 분석 작업 공간</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${viewMode === 'folders' ? 'active' : ''}`}
            onClick={() => setViewMode('folders')}
          >
            <span className="nav-icon">📂</span>
            폴더 탐색
          </button>
          <button
            className={`nav-item ${viewMode === 'library' ? 'active' : ''}`}
            onClick={() => setViewMode('library')}
          >
            <span className="nav-icon">📊</span>
            분석 라이브러리
          </button>
        </nav>

        <div className="sidebar-divider" />

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            <span className="nav-icon">⚙</span>
            설정
          </button>
          <button
            className={`nav-item ${showLog ? 'active' : ''}`}
            onClick={() => setShowLog(!showLog)}
          >
            <span className="nav-icon">📋</span>
            실행 로그
          </button>
        </nav>

        <div className="sidebar-spacer" />

        {/* 사이드바 하단: 상태 표시 */}
        <div className="sidebar-status">
          <div className="status-dots">
            <span className={`dot ${environment?.checks.codex.ok ? 'ok' : 'bad'}`} />
            <span className={`dot ${environment?.checks.chatgptLogin.ok ? 'ok' : 'bad'}`} />
            <span className={`dot ${environment?.checks.ffmpeg.ok ? 'ok' : 'bad'}`} />
            <span className={`dot ${environment?.checks.ffprobe.ok ? 'ok' : 'bad'}`} />
          </div>
          <small>{isAnalyzing ? '분석 중...' : '대기 중'}</small>
        </div>

        <button className="sidebar-folder-btn" onClick={handlePickRootFolder} disabled={isBusy}>
          📁 기본 폴더 선택
        </button>
      </aside>

      {/* ── 메인 영역 ── */}
      <main className="main-area">
        {/* 진행도 바 (분석 중일 때) */}
        {isAnalyzing && (
          <div className="top-progress">
            <div className="top-progress-bar">
              <div
                className="top-progress-fill"
                style={{ width: `${Math.max(0, Math.min(100, displayProgress.percent))}%` }}
              />
            </div>
            <div className="top-progress-info">
              <span>{displayProgress.percent}% · {displayProgress.message || '분석 중...'}</span>
              <button className="cancel-btn" onClick={handleCancel}>취소</button>
            </div>
          </div>
        )}

        {errorMessage && <div className="error-banner">{errorMessage}</div>}

        {/* ── 설정 패널 (토글) ── */}
        {showSettings && (
          <section className="panel settings-panel">
            <div className="settings-header">
              <h2>환경 설정</h2>
              <button className="ghost-button" onClick={() => setShowSettings(false)}>닫기</button>
            </div>
            <div className="settings-grid">
              <label className="field">
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
              <label className="field">
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
              <button className="primary-button" onClick={handleRefreshEnvironment} disabled={isBusy}>
                {isBusy ? '준비 중...' : '저장 및 점검'}
              </button>
            </div>
            <div className="status-strip">
              <span className={`status-pill ${environment?.checks.codex.ok ? 'ok' : 'bad'}`}>
                Codex {environment?.checks.codex.ok ? '준비됨' : '확인 필요'}
              </span>
              <span className={`status-pill ${environment?.checks.chatgptLogin.ok ? 'ok' : 'bad'}`}>
                로그인 {environment?.checks.chatgptLogin.ok ? '정상' : '필요'}
              </span>
              <span className={`status-pill ${environment?.checks.ffmpeg.ok ? 'ok' : 'bad'}`}>
                ffmpeg {environment?.checks.ffmpeg.ok ? '준비됨' : '확인 필요'}
              </span>
              <span className={`status-pill ${environment?.checks.ffprobe.ok ? 'ok' : 'bad'}`}>
                ffprobe {environment?.checks.ffprobe.ok ? '준비됨' : '확인 필요'}
              </span>
            </div>
          </section>
        )}

        {/* ── 실행 로그 (토글) ── */}
        {showLog && (
          <section className="panel log-panel">
            <div className="settings-header">
              <h2>실행 로그</h2>
              <div className="action-group">
                <span className="status-inline">{statusMessage}</span>
                <button className="ghost-button" onClick={() => setShowLog(false)}>닫기</button>
              </div>
            </div>
            <pre className="console-output">
              {logLines.length > 0
                ? logLines.join('\n')
                : '아직 실행 로그가 없습니다. 폴더 분석을 시작하면 Codex 출력이 여기에 표시됩니다.'}
            </pre>
          </section>
        )}

        {/* ══════ 폴더 탐색 뷰 ══════ */}
        {viewMode === 'folders' && (
          <div className="folder-view">
            {/* 좌측: 폴더 트리 */}
            <aside className="folder-tree-pane panel">
              <div className="pane-header">
                <h2>폴더 구조</h2>
                <div className="action-group">
                  <button
                    className="ghost-button small"
                    onClick={() => rootFolder && window.codexVideoAnalyzer.showItemInFolder(rootFolder)}
                    disabled={!rootFolder}
                  >
                    열기
                  </button>
                  <button
                    className="ghost-button small"
                    onClick={() => refreshWorkspace(rootFolder, selectedFolderPath || rootFolder, true)}
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
                    onToggle={handleToggleFolder}
                    onSelect={(folderPath) => void loadFolderVideosForPath(folderPath, false)}
                  />
                </div>
              ) : (
                <div className="empty-card">기본 폴더를 선택하면 폴더 트리가 표시됩니다.</div>
              )}

              {/* 분석 버튼 */}
              <div className="analyze-action">
                {isAnalyzing ? (
                  <button className="danger-button full-width" onClick={handleCancel}>
                    분석 취소
                  </button>
                ) : (
                  <button
                    className="primary-button full-width"
                    onClick={handleAnalyzeSelectedFolder}
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

            {/* 중앙: 폴더 영상 목록 */}
            <section className="folder-content">
              <div className="content-header">
                <div>
                  <h1>{formatFolderPath(selectedFolderPath, rootFolder)}</h1>
                  <p className="content-subtitle">
                    영상 {folderVideos.length}개 · 분석됨 {analyzedFolderVideoCount}개 · 미분석 {pendingFolderVideoCount}개
                  </p>
                </div>
              </div>

              <div className="video-grid">
                {folderVideos.map((video) => (
                  <button
                    key={video.absolutePath}
                    className={`video-card ${video.absolutePath === selectedVideoPath ? 'active' : ''}`}
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
                      <p>
                        {video.analyzed
                          ? video.summary
                          : '아직 분석 결과가 없습니다.'}
                      </p>
                    </div>
                  </button>
                ))}

                {folderVideos.length === 0 && (
                  <div className="empty-card">선택한 폴더에 직접 들어 있는 영상이 없습니다.</div>
                )}
              </div>
            </section>

            {/* 우측: 선택 영상 상세 */}
            <aside className="detail-pane panel">
              {selectedVideo ? (
                <>
                  <video
                    key={selectedAnalysisVideo?.videoUrl || selectedFolderVideo?.videoUrl || ''}
                    className="detail-player"
                    src={selectedAnalysisVideo?.videoUrl || selectedFolderVideo?.videoUrl || ''}
                    controls
                    playsInline
                    preload="metadata"
                  />

                  <h2>{selectedVideo?.title || selectedVideo?.fileName || '영상 정보'}</h2>

                  <div className="detail-meta">
                    <div className="meta-item">
                      <span>길이</span>
                      <strong>{formatDuration(selectedVideo.durationSeconds)}</strong>
                    </div>
                    <div className="meta-item">
                      <span>해상도</span>
                      <strong>{formatResolution(selectedVideo.width, selectedVideo.height)}</strong>
                    </div>
                    <div className="meta-item">
                      <span>오디오</span>
                      <strong>{selectedVideo.hasAudio == null ? '-' : selectedVideo.hasAudio ? '있음' : '없음'}</strong>
                    </div>
                  </div>

                  {selectedVideoIsAnalyzed && selectedAnalysisVideo ? (
                    <>
                      <div className="detail-section">
                        <h3>요약</h3>
                        <p>{selectedAnalysisVideo.summary}</p>
                      </div>
                      <div className="detail-section">
                        <h3>세부 설명</h3>
                        <ul>
                          {selectedAnalysisVideo.details.map((detail) => (
                            <li key={detail}>{detail}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="detail-section">
                        <h3>태그</h3>
                        <div className="pill-row">
                          {[...selectedAnalysisVideo.categories, ...selectedAnalysisVideo.keywords].map(
                            (tag) => (
                              <span key={`${selectedAnalysisVideo.absolutePath}-${tag}`} className="mini-pill">
                                {tag}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="detail-section">
                      <p className="muted">이 영상은 아직 분석되지 않았습니다.</p>
                    </div>
                  )}

                  <div className="detail-actions">
                    <button
                      className="ghost-button small"
                      onClick={() => selectedVideo && window.codexVideoAnalyzer.showItemInFolder(selectedVideo.absolutePath)}
                    >
                      파일 위치
                    </button>
                    <button
                      className="ghost-button small"
                      onClick={() => selectedVideo && window.codexVideoAnalyzer.openPath(selectedVideo.absolutePath)}
                    >
                      외부 앱으로 열기
                    </button>
                    {selectedAnalysisVideo && (
                      <button
                        className="ghost-button small"
                        onClick={() => window.codexVideoAnalyzer.openPath(selectedAnalysisVideo.analysisFilePath)}
                      >
                        분석 문서 열기
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="empty-card detail-empty">
                  영상을 선택하면 상세 정보가 여기에 표시됩니다.
                </div>
              )}
            </aside>
          </div>
        )}

        {/* ══════ 분석 라이브러리 뷰 ══════ */}
        {viewMode === 'library' && (
          <div className="library-view">
            {/* 좌측: 카드 그리드 */}
            <section className="library-content">
              <div className="content-header">
                <div>
                  <h1>분석 라이브러리</h1>
                  <p className="content-subtitle">
                    분석 완료된 영상 {analysis?.videos.length ?? 0}개
                  </p>
                </div>
                <div className="filter-row">
                  <input
                    className="search-input"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="제목, 요약, 태그, 파일명으로 검색"
                  />
                  {searchText && (
                    <button className="ghost-button small" onClick={() => setSearchText('')}>
                      초기화
                    </button>
                  )}
                </div>
              </div>

              <div className="library-grid">
                {filteredAnalysisVideos.map((video) => (
                  <button
                    key={video.absolutePath}
                    className={`lib-card ${video.absolutePath === selectedVideoPath ? 'active' : ''}`}
                    onClick={() => setSelectedVideoPath(video.absolutePath)}
                  >
                    <VideoThumbnail
                      videoUrl={video.videoUrl}
                      sampleImageUrl={video.sampleImageUrl}
                      title={video.title}
                    />
                    <div className="lib-card-body">
                      <strong>{video.title}</strong>
                      <span className="lib-card-meta">
                        {video.relativePath} · {formatDuration(video.durationSeconds)}
                      </span>
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
                      : '아직 분석된 영상이 없습니다. 폴더 탐색에서 분석을 시작해 주세요.'}
                  </div>
                )}
              </div>
            </section>

            {/* 우측: 상세 인스펙터 */}
            <aside className="detail-pane panel">
              {selectedAnalysisVideo ? (
                <>
                  <video
                    key={selectedAnalysisVideo.videoUrl}
                    className="detail-player"
                    src={selectedAnalysisVideo.videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                  />

                  <h2>{selectedAnalysisVideo.title}</h2>

                  <div className="detail-meta">
                    <div className="meta-item">
                      <span>길이</span>
                      <strong>{formatDuration(selectedAnalysisVideo.durationSeconds)}</strong>
                    </div>
                    <div className="meta-item">
                      <span>해상도</span>
                      <strong>{formatResolution(selectedAnalysisVideo.width, selectedAnalysisVideo.height)}</strong>
                    </div>
                    <div className="meta-item">
                      <span>오디오</span>
                      <strong>{selectedAnalysisVideo.hasAudio == null ? '-' : selectedAnalysisVideo.hasAudio ? '있음' : '없음'}</strong>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>요약</h3>
                    <p>{selectedAnalysisVideo.summary}</p>
                  </div>

                  <div className="detail-section">
                    <h3>세부 설명</h3>
                    <ul>
                      {selectedAnalysisVideo.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="detail-section">
                    <h3>태그</h3>
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

                  <div className="detail-actions">
                    <button
                      className="ghost-button small"
                      onClick={() => window.codexVideoAnalyzer.showItemInFolder(selectedAnalysisVideo.absolutePath)}
                    >
                      파일 위치
                    </button>
                    <button
                      className="ghost-button small"
                      onClick={() => window.codexVideoAnalyzer.openPath(selectedAnalysisVideo.absolutePath)}
                    >
                      외부 앱으로 열기
                    </button>
                    <button
                      className="ghost-button small"
                      onClick={() => window.codexVideoAnalyzer.openPath(selectedAnalysisVideo.analysisFilePath)}
                    >
                      분석 문서 열기
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-card detail-empty">
                  분석된 영상을 선택하면 상세 정보가 여기에 표시됩니다.
                </div>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
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

function areAnalysisPrerequisitesReady(environment: EnvironmentStatus | null) {
  if (!environment) {
    return false
  }

  return (
    environment.checks.codex.ok &&
    environment.checks.chatgptLogin.ok &&
    environment.checks.ffmpeg.ok &&
    environment.checks.ffprobe.ok
  )
}

function getFallbackSettings(): ToolSettings {
  return {
    codexCommand: 'codex',
    ffmpegCommand: 'ffmpeg',
    lastRootPath: '',
  }
}

export default App
