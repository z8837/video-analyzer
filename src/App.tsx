import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import type { SyntheticEvent } from 'react'
import './App.css'
import type {
  AnalysisData,
  AnalysisEvent,
  AnalysisProgress,
  AnalysisVideo,
  AppEvent,
  EnvironmentStatus,
  FolderItem,
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

function VideoThumbnail({ video }: { video: AnalysisVideo }) {
  const handleLoadedMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    const element = event.currentTarget
    if (element.duration > 0 && element.currentTime === 0) {
      try {
        element.currentTime = Math.min(0.05, element.duration)
      } catch {
        // Ignore seek errors and keep the default first frame.
      }
    }
  }

  const handleFrameReady = (event: SyntheticEvent<HTMLVideoElement>) => {
    event.currentTarget.pause()
  }

  return (
    <div
      className={`video-thumb ${video.sampleImageUrl ? 'has-image' : 'has-video'}`}
      style={
        video.sampleImageUrl ? { backgroundImage: `url("${video.sampleImageUrl}")` } : undefined
      }
    >
      {!video.sampleImageUrl && (
        <video
          key={video.videoUrl}
          className="video-thumb-player"
          src={video.videoUrl}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleFrameReady}
          onSeeked={handleFrameReady}
        />
      )}
    </div>
  )
}

function App() {
  const [settings, setSettings] = useState<ToolSettings | null>(null)
  const [draftSettings, setDraftSettings] = useState<ToolSettings | null>(null)
  const [environment, setEnvironment] = useState<EnvironmentStatus | null>(null)
  const [rootFolder, setRootFolder] = useState('')
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [selectedFolderPath, setSelectedFolderPath] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [progress, setProgress] = useState<AnalysisProgress>(EMPTY_PROGRESS)
  const [selectedVideoPath, setSelectedVideoPath] = useState('')
  const [searchText, setSearchText] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [logLines, setLogLines] = useState<string[]>([])
  const [statusMessage, setStatusMessage] = useState('프로젝트를 준비하는 중...')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const deferredSearchText = useDeferredValue(searchText)

  const selectedFolder =
    folders.find((folder) => folder.path === selectedFolderPath) ?? null
  const selectedVideo =
    analysis?.videos.find((video) => video.absolutePath === selectedVideoPath) ?? null
  const analyzeFolderPath = rootFolder
    ? `${rootFolder.replace(/[\\/]+$/, '')}${rootFolder.includes('\\') ? '\\' : '/'}analyze`
    : ''

  const refreshBaseFolderData = async (basePath = rootFolder) => {
    if (!basePath) {
      return
    }

    setIsBusy(true)
    setErrorMessage('')

    try {
      const [scannedFolders, loadedAnalysis, loadedProgress] = await Promise.all([
        window.codexVideoAnalyzer.scanFolders(basePath),
        window.codexVideoAnalyzer.loadAnalysis(basePath),
        window.codexVideoAnalyzer.loadAnalysisProgress(basePath),
      ])

      setFolders(scannedFolders)
      setAnalysis(loadedAnalysis)
      setProgress(loadedProgress)
      setSelectedFolderPath((current) => {
        const preserved = scannedFolders.find((folder) => folder.path === current)?.path ?? ''
        return preserved || scannedFolders[0]?.path || ''
      })
      setSelectedVideoPath((current) => {
        if (current && loadedAnalysis.videos.some((video) => video.absolutePath === current)) {
          return current
        }

        return loadedAnalysis.videos[0]?.absolutePath ?? ''
      })
      setStatusMessage(
        scannedFolders.length > 0
          ? `${scannedFolders.length}개 소스 폴더와 저장된 analyze 결과를 새로 불러왔습니다.`
          : '선택한 기본 디렉토리에서 영상 폴더를 찾지 못했습니다.',
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
        setStatusMessage('도구 점검이 끝났습니다. 상단 File 메뉴에서 기본 폴더를 선택하세요.')
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : String(error))
        }
      }
    }

    bootstrap()

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
        setStatusMessage(`기본 폴더를 불러왔습니다: ${event.rootPath}`)
        setErrorMessage('')
      }
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = window.codexVideoAnalyzer.onAnalysisEvent(
      async (event: AnalysisEvent) => {
        if (event.type === 'started') {
          setIsAnalyzing(true)
          setLogLines([])
          setStatusMessage(`분석 시작: ${event.folderPath}`)
          setErrorMessage('')
          const nextProgress = await window.codexVideoAnalyzer.loadAnalysisProgress(
            event.folderPath,
          )
          setProgress(nextProgress)
          return
        }

        if (event.type === 'log') {
          setLogLines((previous) =>
            [...previous, event.message.trimEnd()].filter(Boolean).slice(-500),
          )
          return
        }

        if (event.type === 'completed') {
          setIsAnalyzing(false)
          setAnalysis(event.analysis)
          setSelectedVideoPath((current) => {
            if (
              current &&
              event.analysis.videos.some((video) => video.absolutePath === current)
            ) {
              return current
            }

            return event.analysis.videos[0]?.absolutePath ?? ''
          })
          setProgress(await window.codexVideoAnalyzer.loadAnalysisProgress(event.folderPath))
          setStatusMessage(event.finalMessage || '분석이 완료되었습니다.')
          return
        }

        if (event.type === 'cancelled') {
          setIsAnalyzing(false)
          if (event.folderPath) {
            setProgress(await window.codexVideoAnalyzer.loadAnalysisProgress(event.folderPath))
          }
          setStatusMessage('분석이 취소되었습니다.')
          return
        }

        if (event.type === 'failed') {
          setIsAnalyzing(false)
          if (event.folderPath) {
            setProgress(await window.codexVideoAnalyzer.loadAnalysisProgress(event.folderPath))
          }
          setErrorMessage(
            [event.error, event.finalMessage].filter(Boolean).join('\n\n'),
          )
          setStatusMessage('분석에 실패했습니다.')
        }
      },
    )

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!rootFolder) {
      setFolders([])
      setSelectedFolderPath('')
      setAnalysis(null)
      setProgress(EMPTY_PROGRESS)
      setSelectedVideoPath('')
      return
    }

    const refreshRootData = async () => {
      setIsBusy(true)
      setErrorMessage('')

      try {
        const [scannedFolders, loadedAnalysis, loadedProgress] = await Promise.all([
          window.codexVideoAnalyzer.scanFolders(rootFolder),
          window.codexVideoAnalyzer.loadAnalysis(rootFolder),
          window.codexVideoAnalyzer.loadAnalysisProgress(rootFolder),
        ])

        setFolders(scannedFolders)
        setAnalysis(loadedAnalysis)
        setProgress(loadedProgress)
        setSelectedFolderPath((current) => {
          const preserved = scannedFolders.find((folder) => folder.path === current)?.path ?? ''
          return preserved || scannedFolders[0]?.path || ''
        })
        setSelectedVideoPath((current) => {
          if (current && loadedAnalysis.videos.some((video) => video.absolutePath === current)) {
            return current
          }

          return loadedAnalysis.videos[0]?.absolutePath ?? ''
        })
        setStatusMessage(
          scannedFolders.length > 0
            ? `${scannedFolders.length}개 소스 폴더와 저장된 analyze 결과를 새로 불러왔습니다.`
            : '선택한 기본 디렉토리에서 영상 폴더를 찾지 못했습니다.',
        )
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : String(error))
      } finally {
        setIsBusy(false)
      }
    }

    refreshRootData()
  }, [rootFolder])

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

    poll()

    return () => {
      cancelled = true
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [isAnalyzing, rootFolder])

  const tags = useMemo(() => {
    const counts = new Map<string, number>()

    for (const video of analysis?.videos ?? []) {
      for (const tag of [...video.categories, ...video.keywords]) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }

    return [...counts.entries()]
      .sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1]
        }
        return left[0].localeCompare(right[0], 'ko')
      })
      .slice(0, 16)
  }, [analysis])

  const filteredVideos = useMemo(() => {
    const query = deferredSearchText.trim().toLowerCase()

    return (analysis?.videos ?? []).filter((video) => {
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

      const matchesQuery = !query || haystack.includes(query)
      const matchesTag =
        !activeTag ||
        video.categories.includes(activeTag) ||
        video.keywords.includes(activeTag)

      return matchesQuery && matchesTag
    })
  }, [activeTag, analysis, deferredSearchText])

  const displayProgress = useMemo(() => {
    if (progress.exists) {
      return progress
    }

    return {
      ...EMPTY_PROGRESS,
      folderPath: selectedFolderPath,
      totalFiles: selectedFolder?.videoCount ?? 0,
      pendingFiles: selectedFolder?.videoCount ?? 0,
    }
  }, [progress, selectedFolder, selectedFolderPath])

  const handleRefreshEnvironment = async () => {
    setIsBusy(true)
    setErrorMessage('')

    try {
      const nextSettings = draftSettings ?? settings
      if (nextSettings) {
        const saved = await window.codexVideoAnalyzer.saveSettings(nextSettings)
        setSettings(saved)
        setDraftSettings(saved)
      }

      const refreshed = await window.codexVideoAnalyzer.getEnvironmentStatus()
      setEnvironment(refreshed)
      setStatusMessage('도구 경로와 로그인 상태를 다시 확인했습니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsBusy(false)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFolderPath || !rootFolder) {
      return
    }

    setErrorMessage('')
    const sourceLabel =
      folders.find((folder) => folder.path === selectedFolderPath)?.relativePath || '.'
    setStatusMessage(`Codex CLI에 "${sourceLabel}" 폴더 추가 분석 작업을 전달했습니다.`)

    try {
      await window.codexVideoAnalyzer.startAnalysis(selectedFolderPath)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
      setIsAnalyzing(false)
    }
  }

  const handleRefreshBaseFolder = async () => {
    await refreshBaseFolderData()
  }

  const handleCancel = async () => {
    await window.codexVideoAnalyzer.cancelAnalysis()
  }

  const renderCheck = (
    label: string,
    check: EnvironmentStatus['checks'][keyof EnvironmentStatus['checks']],
  ) => (
    <article className={`status-pill ${check.ok ? 'ok' : 'bad'}`}>
      <span>{label}</span>
      <strong>{check.ok ? '준비됨' : '확인 필요'}</strong>
      <small>{check.detail}</small>
    </article>
  )

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Codex CLI Local Workflow</p>
          <h1>Codex Video Analyzer</h1>
          <p className="lede">
            폴더를 나눠 둔 영상 라이브러리에서 원하는 폴더만 골라
            <strong> Codex CLI + GPT-5.4</strong>로 분석하고, 결과를
            태그/검색/미리보기까지 한 화면에서 처리합니다.
          </p>
        </div>

        <div className="hero-meta">
          <div>
            <span>고정 모델</span>
            <strong>{environment?.model ?? 'gpt-5.4'}</strong>
          </div>
          <div>
            <span>Reasoning</span>
            <strong>{environment?.reasoningEffort ?? 'xhigh'}</strong>
          </div>
          <div>
            <span>상태</span>
            <strong>{isAnalyzing ? '분석 중' : '대기 중'}</strong>
          </div>
        </div>
      </section>

      <section className="toolbar-grid">
        <article className="panel settings-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Environment</p>
              <h2>로컬 도구 경로</h2>
            </div>
            <button className="ghost-button" onClick={handleRefreshEnvironment}>
              저장 및 점검
            </button>
          </div>

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

          <div className="root-picker">
            <div>
              <p className="section-kicker">Base Folder</p>
              <strong>{rootFolder || '상단 File 메뉴에서 선택'}</strong>
            </div>
            <div className="action-group">
              <span className="platform-chip">File &gt; 기본 폴더 선택...</span>
              <button
                className="ghost-button"
                onClick={handleRefreshBaseFolder}
                disabled={!rootFolder || isBusy || isAnalyzing}
              >
                새로고침
              </button>
            </div>
          </div>
        </article>

        <article className="panel checks-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Readiness</p>
              <h2>실행 가능 여부</h2>
            </div>
            <span className="platform-chip">{environment?.platform ?? '...'}</span>
          </div>

          <div className="status-grid">
            {environment && renderCheck('Codex CLI', environment.checks.codex)}
            {environment &&
              renderCheck('ChatGPT 로그인', environment.checks.chatgptLogin)}
            {environment && renderCheck('ffmpeg', environment.checks.ffmpeg)}
            {environment && renderCheck('ffprobe', environment.checks.ffprobe)}
          </div>
        </article>
      </section>

      <section className="workspace-grid">
        <article className="panel folder-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Folders</p>
              <h2>추가 분석할 폴더</h2>
            </div>
            <span className="count-chip">{folders.length}개</span>
          </div>

          <div className="folder-list">
            {folders.map((folder) => (
              <button
                key={folder.path}
                className={`folder-card ${
                  folder.path === selectedFolderPath ? 'active' : ''
                }`}
                disabled={isAnalyzing}
                onClick={() => {
                  setSelectedFolderPath(folder.path)
                }}
              >
                <strong>{folder.name}</strong>
                <span>{folder.relativePath}</span>
                <small>영상 {folder.videoCount}개</small>
              </button>
            ))}

            {folders.length === 0 && (
              <div className="empty-card">
                기본 디렉토리를 선택하면 영상이 들어 있는 하위 폴더 목록이
                여기에 표시됩니다.
              </div>
            )}
          </div>
        </article>

        <article className="panel results-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Results</p>
              <h2>{rootFolder ? 'analyze 전체 결과' : '기본 디렉토리를 선택하세요'}</h2>
              <p className="section-note">
                {selectedFolder
                  ? `추가 분석 대상: ${selectedFolder.relativePath} · 영상 ${selectedFolder.videoCount}개`
                  : '왼쪽에서 추가 분석할 폴더를 고르세요.'}
              </p>
            </div>

            <div className="action-group">
              <button
                className="ghost-button"
                onClick={() =>
                  rootFolder &&
                  window.codexVideoAnalyzer.showItemInFolder(rootFolder)
                }
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
                onClick={handleRefreshBaseFolder}
                disabled={!rootFolder || isBusy || isAnalyzing}
              >
                새로고침
              </button>
              {isAnalyzing ? (
                <button className="danger-button" onClick={handleCancel}>
                  취소
                </button>
              ) : (
                <button
                  className="primary-button"
                  onClick={handleAnalyze}
                  disabled={!selectedFolder || isBusy}
                >
                  이 폴더 분석
                </button>
              )}
            </div>
          </div>

          <div className="progress-card">
            <div className="progress-head">
              <div>
                <p className="section-kicker">Progress</p>
                <strong>{formatProgressStatus(displayProgress.status)}</strong>
              </div>
              <strong className="progress-percent">{displayProgress.percent}%</strong>
            </div>

            <div className="progress-bar" aria-hidden="true">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.max(0, Math.min(100, displayProgress.percent))}%` }}
              />
            </div>

            <div className="progress-meta">
              <span>전체 {displayProgress.totalFiles}개</span>
              <span>재사용 {displayProgress.reusableFiles}개</span>
              <span>신규 완료 {displayProgress.completedFiles}개</span>
              <span>남음 {displayProgress.pendingFiles}개</span>
            </div>

            {(displayProgress.message || displayProgress.currentFile) && (
              <p className="progress-copy">
                {displayProgress.message || '진행 상황을 갱신하는 중입니다.'}
                {displayProgress.currentFile
                  ? ` · ${displayProgress.currentFile}`
                  : ''}
              </p>
            )}
          </div>

          <div className="filter-row">
            <input
              className="search-input"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder='예: "음식", "산책", "셀카"'
            />
            <button className="ghost-button" onClick={() => setSearchText('')}>
              지우기
            </button>
          </div>

          <div className="tag-row">
            <button
              className={`tag-chip ${!activeTag ? 'active' : ''}`}
              onClick={() => setActiveTag('')}
            >
              전체
            </button>
            {tags.map(([tag, count]) => (
              <button
                key={tag}
                className={`tag-chip ${activeTag === tag ? 'active' : ''}`}
                onClick={() => setActiveTag(tag)}
              >
                {tag} · {count}
              </button>
            ))}
          </div>

          {analysis?.exists ? (
            <div className="results-meta">
              <span>생성 시각: {analysis.generatedAt || '-'}</span>
              <span>저장된 분석: {analysis.videos.length}개</span>
              <span>표시 결과: {filteredVideos.length}개</span>
              <span>모델: {analysis.model}</span>
            </div>
          ) : (
            <div className="results-meta muted">
              기본 디렉토리의 analyze 폴더에 아직 분석 결과가 없습니다.
            </div>
          )}

          <div className="video-list">
            {filteredVideos.map((video) => (
              <button
                key={video.absolutePath}
                className={`video-card ${
                  video.absolutePath === selectedVideoPath ? 'active' : ''
                }`}
                onClick={() => setSelectedVideoPath(video.absolutePath)}
              >
                <VideoThumbnail video={video} />
                <div className="video-card-body">
                  <div className="video-card-top">
                    <strong>{video.title}</strong>
                    {video.skippedFromExisting && (
                      <span className="reuse-badge">기존 분석 재사용</span>
                    )}
                  </div>
                  <span>{video.relativePath}</span>
                  <p>{video.summary}</p>
                  <div className="pill-row">
                    {video.categories.map((category) => (
                      <span key={`${video.absolutePath}-${category}`} className="mini-pill">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}

            {analysis?.exists && filteredVideos.length === 0 && (
              <div className="empty-card">현재 검색 조건에 맞는 영상이 없습니다.</div>
            )}
          </div>
        </article>

        <article className="panel inspector-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Preview</p>
              <h2>{selectedVideo?.title ?? '영상 미리보기'}</h2>
            </div>
            <div className="action-group">
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
            </div>
          </div>

          {selectedVideo ? (
            <>
              <video
                key={selectedVideo.videoUrl}
                className="video-player"
                src={selectedVideo.videoUrl}
                controls
                playsInline
                preload="metadata"
              />

              <div className="inspector-meta">
                <span>{selectedVideo.relativePath}</span>
                <span>
                  길이 {selectedVideo.durationSeconds?.toFixed(1) ?? '-'}초
                </span>
                {selectedVideo.width && selectedVideo.height && (
                  <span>
                    해상도 {selectedVideo.width}×{selectedVideo.height}
                  </span>
                )}
                {selectedVideo.fps && <span>FPS {selectedVideo.fps.toFixed(2)}</span>}
                {selectedVideo.hasAudio != null && (
                  <span>오디오 {selectedVideo.hasAudio ? '있음' : '없음'}</span>
                )}
              </div>

              <p className="summary-copy">{selectedVideo.summary}</p>

              <div className="detail-section">
                <h3>세부 설명</h3>
                <ul>
                  {selectedVideo.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </div>

              <div className="detail-section">
                <h3>검색 키워드</h3>
                <div className="pill-row">
                  {[...selectedVideo.categories, ...selectedVideo.keywords].map((tag) => (
                    <button
                      key={`${selectedVideo.absolutePath}-${tag}`}
                      className="mini-pill clickable"
                      onClick={() => {
                        setActiveTag(tag)
                        setSearchText(tag)
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="detail-section markdown-section">
                <div className="section-heading compact">
                  <h3>분석 파일 원문</h3>
                  <button
                    className="ghost-button"
                    onClick={() =>
                      window.codexVideoAnalyzer.openPath(selectedVideo.analysisFilePath)
                    }
                  >
                    Markdown 열기
                  </button>
                </div>
                <pre>{selectedVideo.analysisMarkdown}</pre>
              </div>
            </>
          ) : (
            <div className="empty-card preview-empty">
              왼쪽에서 분석 결과를 선택하면 여기서 바로 재생하고 확인할 수 있습니다.
            </div>
          )}
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

        {errorMessage && <div className="error-banner">{errorMessage}</div>}

        <pre className="console-output">
          {logLines.length > 0
            ? logLines.join('\n')
            : '아직 실행 로그가 없습니다. 분석을 시작하면 Codex 출력이 여기에 표시됩니다.'}
        </pre>
      </section>
    </main>
  )
}

function formatProgressStatus(status: string) {
  switch (status) {
    case 'running':
      return '분석 진행 중'
    case 'completed':
      return '완료'
    case 'failed':
      return '실패'
    case 'cancelled':
      return '취소됨'
    default:
      return '대기 중'
  }
}

function getFallbackSettings(): ToolSettings {
  return {
    codexCommand: 'codex',
    ffmpegCommand: 'ffmpeg',
    lastRootPath: '',
  }
}

export default App
