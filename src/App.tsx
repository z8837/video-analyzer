import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { DragEvent } from 'react'
import './App.css'
import { AnalysisLibraryPage } from './pages/AnalysisLibraryPage'
import { FolderExplorerPage } from './pages/FolderExplorerPage'
import type {
  AnalysisData,
  AnalysisEvent,
  AnalysisProgress,
  AnalysisVideo,
  AppEvent,
  CodexRateLimitsSnapshot,
  CodexReasoningEffort,
  EnvironmentStatus,
  FolderTreeNode,
  FolderVideoItem,
  KeywordMoment,
  ToolSettings,
} from './types'
import { CodexRateLimitsPanel } from './components/CodexRateLimitsPanel'

type ViewMode = 'folders' | 'library'

const CODEX_MODEL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'gpt-5.4', label: 'gpt-5.4 (최신 frontier)' },
  { value: 'gpt-5.4-mini', label: 'gpt-5.4-mini (소형, 저렴)' },
  { value: 'gpt-5.3-codex', label: 'gpt-5.3-codex (코딩 특화)' },
  { value: 'gpt-5.2', label: 'gpt-5.2 (장시간 작업용)' },
]

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

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('library')
  const [hasVisitedFolders, setHasVisitedFolders] = useState(false)
  const [hasVisitedLibrary, setHasVisitedLibrary] = useState(true)
  const [settings, setSettings] = useState<ToolSettings | null>(null)
  const [draftSettings, setDraftSettings] = useState<ToolSettings | null>(null)
  const [environment, setEnvironment] = useState<EnvironmentStatus | null>(null)
  const [rootFolder, setRootFolder] = useState('')
  const [folderTree, setFolderTree] = useState<FolderTreeNode | null>(null)
  const [folderVideos, setFolderVideos] = useState<FolderVideoItem[]>([])
  const [selectedFolderPath, setSelectedFolderPath] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [progress, setProgress] = useState<AnalysisProgress>(EMPTY_PROGRESS)
  const [folderSelectedVideoPath, setFolderSelectedVideoPath] = useState('')
  const [librarySelectedVideoPath, setLibrarySelectedVideoPath] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchFilters, setSearchFilters] = useState<string[]>([])
  const [logLines, setLogLines] = useState<string[]>([])
  const [statusMessage, setStatusMessage] = useState('작업 공간을 준비하는 중입니다.')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [expandedFolderPaths, setExpandedFolderPaths] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [codexRateLimits, setCodexRateLimits] = useState<CodexRateLimitsSnapshot | null>(null)
  const [isRefreshingCodexRateLimits, setIsRefreshingCodexRateLimits] = useState(false)
  const [isDownloadingEventsLog, setIsDownloadingEventsLog] = useState(false)
  const deferredFilters = useDeferredValue(searchFilters)
  const folderPlayerRef = useRef<HTMLVideoElement | null>(null)
  const libraryPlayerRef = useRef<HTMLVideoElement | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)

  const analysisByPath = useMemo(() => {
    return new Map((analysis?.videos ?? []).map((video) => [video.absolutePath, video]))
  }, [analysis])

  const folderVideoByPath = useMemo(() => {
    return new Map(folderVideos.map((video) => [video.absolutePath, video]))
  }, [folderVideos])

  const expandedPathSet = useMemo(() => new Set(expandedFolderPaths), [expandedFolderPaths])

  const addSearchFilter = (text: string) => {
    const trimmed = text.trim()
    if (trimmed && !searchFilters.includes(trimmed)) {
      setSearchFilters((prev) => [...prev, trimmed])
    }
    setSearchInput('')
  }

  const removeSearchFilter = (filter: string) => {
    setSearchFilters((prev) => prev.filter((f) => f !== filter))
  }

  const filteredAnalysisVideos = useMemo(() => {
    if (deferredFilters.length === 0) {
      return analysis?.videos ?? []
    }

    const normalizedFilters = deferredFilters.map(normalizeSearchText).filter(Boolean)

    return (analysis?.videos ?? []).filter((video) => {
      const haystack = buildAnalysisSearchHaystack(video)
      return normalizedFilters.every((filter) => haystack.includes(filter))
    })
  }, [analysis, deferredFilters])

  const selectedFolderNode = useMemo(() => {
    if (!folderTree || !selectedFolderPath) {
      return folderTree
    }

    return findTreeNode(folderTree, selectedFolderPath) ?? folderTree
  }, [folderTree, selectedFolderPath])

  // 폴더 탐색 뷰 선택 영상
  const folderSelectedVideo = folderSelectedVideoPath
    ? folderVideoByPath.get(folderSelectedVideoPath) ?? null
    : null
  const folderSelectedAnalysis = folderSelectedVideoPath
    ? analysisByPath.get(folderSelectedVideoPath) ?? null
    : null
  const folderSelectedIsAnalyzed = Boolean(folderSelectedAnalysis || folderSelectedVideo?.analyzed)

  // 분석 라이브러리 뷰 선택 영상
  const librarySelectedVideo = librarySelectedVideoPath
    ? analysisByPath.get(librarySelectedVideoPath) ?? null
    : null
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
        setFolderSelectedVideoPath((current: string) =>
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
        setFolderSelectedVideoPath((current: string) =>
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
    const prevent = (e: Event) => {
      const drag = e as globalThis.DragEvent
      if (drag.dataTransfer?.types?.includes('Files')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('dragover', prevent)
    document.addEventListener('drop', prevent)
    return () => {
      document.removeEventListener('dragover', prevent)
      document.removeEventListener('drop', prevent)
    }
  }, [])

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
    let cancelled = false
    window.codexVideoAnalyzer
      .getCodexRateLimits()
      .then((snapshot) => {
        if (!cancelled && snapshot) setCodexRateLimits(snapshot)
      })
      .catch(() => {})
    const unsubscribe = window.codexVideoAnalyzer.onCodexRateLimitsUpdate((snapshot) => {
      setCodexRateLimits(snapshot)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const handleRefreshCodexRateLimits = async () => {
    setIsRefreshingCodexRateLimits(true)
    try {
      const snapshot = await window.codexVideoAnalyzer.getCodexRateLimits({ force: true })
      setCodexRateLimits(snapshot)
    } finally {
      setIsRefreshingCodexRateLimits(false)
    }
  }

  useEffect(() => {
    const unsubscribe = window.codexVideoAnalyzer.onAppEvent((event: AppEvent) => {
      if (event.type === 'base-folder-selected') {
        setSettings(event.settings)
        setDraftSettings(event.settings)
        setRootFolder(event.rootPath)
        setSearchFilters([])
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
        setFolderSelectedVideoPath('')
        setLibrarySelectedVideoPath('')
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

  useEffect(() => {
    gridRef.current?.scrollTo({ top: 0 })
  }, [deferredFilters])

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
      setSearchFilters([])
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

  const handleDownloadEventsLog = async () => {
    setIsDownloadingEventsLog(true)
    setErrorMessage('')

    try {
      const result = await window.codexVideoAnalyzer.downloadEventsLog()
      if (result.ok && result.filePath) {
        setStatusMessage(`events.log 저장됨: ${result.filePath}`)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsDownloadingEventsLog(false)
    }
  }

  const handleJumpToKeyword = (video: AnalysisVideo, keywordMoment: KeywordMoment) => {
    if (keywordMoment.timeSeconds == null) {
      return
    }

    const playerRef = viewMode === 'folders' ? folderPlayerRef : libraryPlayerRef
    const jumped = seekVideoPlayer(playerRef.current, keywordMoment.timeSeconds)
    if (jumped) {
      setStatusMessage(
        `${video.fileName}에서 "${keywordMoment.label}" 시점(${formatDuration(keywordMoment.timeSeconds)})으로 이동했습니다.`,
      )
    }
  }

  const handleSelectViewMode = useCallback((nextMode: ViewMode) => {
    if (nextMode === 'folders') {
      setHasVisitedFolders(true)
    } else if (nextMode === 'library') {
      setHasVisitedLibrary(true)
    }
    startTransition(() => {
      setViewMode(nextMode)
    })
  }, [])

  const handleVideoFileDragStart = useCallback(
    (event: DragEvent<HTMLButtonElement>, filePath: string, iconPath = '') => {
      if (!filePath) {
        event.preventDefault()
        return
      }

      event.preventDefault()
      window.codexVideoAnalyzer.startDragFile(filePath, iconPath)
    },
    [],
  )

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
            className={`nav-item ${viewMode === 'library' ? 'active' : ''}`}
            onClick={() => handleSelectViewMode('library')}
          >
            <span className="nav-icon">📊</span>
            분석 라이브러리
          </button>
          <button
            className={`nav-item ${viewMode === 'folders' ? 'active' : ''}`}
            onClick={() => handleSelectViewMode('folders')}
          >
            <span className="nav-icon">📂</span>
            폴더 탐색
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
            <CodexRateLimitsPanel
              snapshot={codexRateLimits}
              variant="compact"
              isRefreshing={isRefreshingCodexRateLimits}
              onRefresh={handleRefreshCodexRateLimits}
            />
          </div>
        )}

        {errorMessage && (
          <div className="error-banner">
            <div className="error-banner-content">{errorMessage}</div>
            <button
              type="button"
              className="error-banner-close"
              onClick={() => setErrorMessage('')}
              aria-label="오류 메시지 닫기"
              title="닫기"
            >
              ✕
            </button>
          </div>
        )}

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
            <div className="settings-grid settings-grid-analysis">
              <label className="field">
                <span>Codex 모델</span>
                <select
                  value={draftSettings?.codexModel ?? 'gpt-5.4'}
                  onChange={(event) =>
                    setDraftSettings((current) => ({
                      ...(current ?? getFallbackSettings()),
                      codexModel: event.target.value,
                    }))
                  }
                >
                  {CODEX_MODEL_OPTIONS.some(
                    (option) => option.value === draftSettings?.codexModel,
                  ) ? null : draftSettings?.codexModel ? (
                    <option value={draftSettings.codexModel}>
                      {draftSettings.codexModel} (커스텀)
                    </option>
                  ) : null}
                  {CODEX_MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Reasoning effort (토큰 사용량)</span>
                <select
                  value={draftSettings?.codexReasoningEffort ?? 'medium'}
                  onChange={(event) =>
                    setDraftSettings((current) => ({
                      ...(current ?? getFallbackSettings()),
                      codexReasoningEffort: event.target.value as CodexReasoningEffort,
                    }))
                  }
                >
                  <option value="minimal">minimal (최소 토큰)</option>
                  <option value="low">low</option>
                  <option value="medium">medium (권장)</option>
                  <option value="high">high (최대 토큰)</option>
                </select>
              </label>
              <label className="field">
                <span>동시 실행 수</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  value={draftSettings?.maxParallelAnalysis ?? 5}
                  onChange={(event) =>
                    setDraftSettings((current) => ({
                      ...(current ?? getFallbackSettings()),
                      maxParallelAnalysis: Math.max(
                        1,
                        Math.min(20, Number(event.target.value) || 1),
                      ),
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>연속 실패 시 중단 (0=끔)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={draftSettings?.consecutiveFailureLimit ?? 5}
                  onChange={(event) =>
                    setDraftSettings((current) => ({
                      ...(current ?? getFallbackSettings()),
                      consecutiveFailureLimit: Math.max(
                        0,
                        Math.min(100, Number(event.target.value) || 0),
                      ),
                    }))
                  }
                />
              </label>
            </div>
            <CodexRateLimitsPanel
              snapshot={codexRateLimits}
              isRefreshing={isRefreshingCodexRateLimits}
              onRefresh={handleRefreshCodexRateLimits}
            />
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
                <button
                  className="ghost-button"
                  onClick={handleDownloadEventsLog}
                  disabled={isDownloadingEventsLog || logLines.length === 0}
                >
                  {isDownloadingEventsLog ? '저장 중...' : 'events.log 다운로드'}
                </button>
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

        {hasVisitedFolders && (
          <div
            className="view-host"
            style={{ display: viewMode === 'folders' ? 'contents' : 'none' }}
          >
          <FolderExplorerPage
            folderTree={folderTree}
            expandedPathSet={expandedPathSet}
            selectedFolderPath={selectedFolderPath}
            selectedFolderNode={selectedFolderNode}
            folderVideos={folderVideos}
            folderSelectedVideoPath={folderSelectedVideoPath}
            folderSelectedVideo={folderSelectedVideo}
            folderSelectedAnalysis={folderSelectedAnalysis}
            folderSelectedIsAnalyzed={folderSelectedIsAnalyzed}
            rootFolder={rootFolder}
            analyzedFolderVideoCount={analyzedFolderVideoCount}
            pendingFolderVideoCount={pendingFolderVideoCount}
            isAnalyzing={isAnalyzing}
            isBusy={isBusy}
            analysisPrerequisitesReady={analysisPrerequisitesReady}
            folderPlayerRef={folderPlayerRef}
            onToggleFolder={handleToggleFolder}
            onSelectFolder={(folderPath) => void loadFolderVideosForPath(folderPath, false)}
            onRefresh={() => void refreshWorkspace(rootFolder, selectedFolderPath || rootFolder, true)}
            onCancel={handleCancel}
            onAnalyzeSelectedFolder={handleAnalyzeSelectedFolder}
            onSelectVideo={setFolderSelectedVideoPath}
            onVideoFileDragStart={handleVideoFileDragStart}
            onShowItemInFolder={(targetPath) => void window.codexVideoAnalyzer.showItemInFolder(targetPath)}
            onJumpToKeyword={handleJumpToKeyword}
            formatFolderPath={formatFolderPath}
            formatDuration={formatDuration}
            formatVideoFolderPath={formatVideoFolderPath}
            getKeywordJumpTargets={getKeywordJumpTargets}
          />
          </div>
        )}

        {hasVisitedLibrary && (
          <div
            className="view-host"
            style={{ display: viewMode === 'library' ? 'contents' : 'none' }}
          >
          <AnalysisLibraryPage
            analysis={analysis}
            filteredAnalysisVideos={filteredAnalysisVideos}
            searchInput={searchInput}
            searchFilters={searchFilters}
            librarySelectedVideoPath={librarySelectedVideoPath}
            librarySelectedVideo={librarySelectedVideo}
            rootFolder={rootFolder}
            isRefreshing={isBusy}
            gridRef={gridRef}
            libraryPlayerRef={libraryPlayerRef}
            onSearchInputChange={setSearchInput}
            onAddSearchFilter={addSearchFilter}
            onRemoveSearchFilter={removeSearchFilter}
            onClearSearchFilters={() => setSearchFilters([])}
            onRefresh={() => void refreshWorkspace(rootFolder, selectedFolderPath || rootFolder, true)}
            onSelectVideo={setLibrarySelectedVideoPath}
            onVideoFileDragStart={handleVideoFileDragStart}
            onShowItemInFolder={(targetPath) => void window.codexVideoAnalyzer.showItemInFolder(targetPath)}
            onJumpToKeyword={handleJumpToKeyword}
            formatDuration={formatDuration}
            formatVideoFolderPath={formatVideoFolderPath}
            getKeywordJumpTargets={getKeywordJumpTargets}
          />
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

  if (currentPaths.length === 0) {
    next.add(tree.path)
  }

  const ancestorPaths = findAncestorPaths(tree, selectedFolderPath || tree.path).slice(0, -1)
  for (const path of ancestorPaths) {
    next.add(path)
  }

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

  return ''
}

function normalizeSearchText(value: string) {
  return value.normalize('NFC').toLowerCase()
}

function getFolderSearchTerms(video: AnalysisVideo) {
  const folderPath =
    (video.folderRelativePath && video.folderRelativePath !== '.'
      ? video.folderRelativePath
      : getFolderPathFromRelativePath(video.relativePath)) || ''

  if (!folderPath) {
    return []
  }

  const normalizedFolderPath = folderPath.replace(/\\/g, '/')
  const folderParts = normalizedFolderPath.split('/').filter(Boolean)

  return [
    normalizedFolderPath,
    normalizedFolderPath.replaceAll('/', ' '),
    normalizedFolderPath.replaceAll('/', ''),
    ...folderParts,
  ]
}

function getFolderPathFromRelativePath(relativePath: string) {
  if (!relativePath.includes('/')) {
    return ''
  }

  return relativePath.slice(0, relativePath.lastIndexOf('/'))
}

function buildAnalysisSearchHaystack(video: AnalysisVideo) {
  return normalizeSearchText(
    [
      video.title,
      video.summary,
      video.fileName,
      video.relativePath,
      video.folderRelativePath || '',
      ...getFolderSearchTerms(video),
      ...video.details,
      ...video.categories,
      ...video.keywords,
    ]
      .filter(Boolean)
      .join(' '),
  )
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

function formatVideoFolderPath(absolutePath: string, rootFolder: string) {
  if (!absolutePath) {
    return './'
  }

  const relativePath =
    rootFolder && absolutePath.startsWith(rootFolder)
      ? absolutePath.slice(rootFolder.length).replace(/^[\\/]+/, '')
      : absolutePath

  const segments = relativePath.split(/[\\/]+/).filter(Boolean)

  if (segments.length <= 1) {
    return './'
  }

  return `${segments.slice(0, -1).join('/')}/`
}

function getKeywordJumpTargets(video: AnalysisVideo): KeywordMoment[] {
  const momentByLabel = new Map(video.keywordMoments.map((keywordMoment) => [keywordMoment.label, keywordMoment]))

  const targets = video.keywords.map(
    (keyword) =>
      momentByLabel.get(keyword) ?? {
        label: keyword,
        timeSeconds: null,
      },
  )

  return targets.sort((a, b) => {
    if (a.timeSeconds == null && b.timeSeconds == null) return 0
    if (a.timeSeconds == null) return 1
    if (b.timeSeconds == null) return -1
    return a.timeSeconds - b.timeSeconds
  })
}

function seekVideoPlayer(player: HTMLVideoElement | null, timeSeconds: number) {
  if (!player || !Number.isFinite(timeSeconds)) {
    return false
  }

  const nextTime = Math.max(0, timeSeconds)

  const applySeek = () => {
    try {
      player.currentTime = nextTime
    } catch {
      // Ignore transient metadata timing errors from the media element.
    }

    // Verify the seek actually applied; if not, retry once after 'seeked' or a short delay.
    if (Math.abs(player.currentTime - nextTime) > 0.5) {
      const retrySeek = () => {
        try {
          player.currentTime = nextTime
        } catch {
          // ignore
        }
      }
      player.addEventListener('seeked', retrySeek, { once: true })
      // Fallback: retry after a short delay if 'seeked' never fires.
      setTimeout(() => {
        player.removeEventListener('seeked', retrySeek)
        if (Math.abs(player.currentTime - nextTime) > 0.5) {
          retrySeek()
        }
      }, 300)
    }
  }

  // readyState >= 2 (HAVE_CURRENT_DATA) means data is available for seeking.
  if (player.readyState >= 2) {
    applySeek()
    return true
  }

  // Wait for enough data to be loaded before seeking.
  player.addEventListener('canplay', applySeek, { once: true })

  // If only metadata or nothing is loaded, trigger a load.
  if (player.readyState < 1) {
    try {
      player.load()
    } catch {
      // Leave the pending seek listener in place if load() is not available.
    }
  }

  return true
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
    codexModel: 'gpt-5.4',
    codexReasoningEffort: 'medium',
    maxParallelAnalysis: 5,
    consecutiveFailureLimit: 5,
  }
}

export default App
