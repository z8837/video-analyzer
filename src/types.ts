export type CodexReasoningEffort = 'minimal' | 'low' | 'medium' | 'high'

export interface ToolSettings {
  codexCommand: string
  ffmpegCommand: string
  lastRootPath: string
  codexModel: string
  codexReasoningEffort: CodexReasoningEffort
  maxParallelAnalysis: number
  consecutiveFailureLimit: number
}

export interface CommandCheck {
  command: string
  ok: boolean
  detail: string
}

export interface EnvironmentStatus {
  platform: string
  model: string
  reasoningEffort: string
  instructionsPath: string
  settings: ToolSettings
  checks: {
    codex: CommandCheck
    chatgptLogin: CommandCheck
    ffmpeg: CommandCheck
    ffprobe: CommandCheck
  }
}

export interface EnvironmentPreparationResult {
  settings: ToolSettings
  environment: EnvironmentStatus
  actions: string[]
  issues: string[]
  message: string
}

export interface FolderItem {
  name: string
  path: string
  relativePath: string
  videoCount: number
}

export interface FolderTreeNode {
  name: string
  path: string
  relativePath: string
  directVideoCount: number
  totalVideoCount: number
  children: FolderTreeNode[]
}

export interface FolderVideoItem {
  fileName: string
  source: string
  relativePath: string
  folderRelativePath: string
  absolutePath: string
  videoUrl: string
  sampleImagePath: string
  sampleImageUrl: string
  analyzed: boolean
  title: string
  summary: string
  generatedAt?: string
  durationSeconds?: number
  width?: number
  height?: number
  fps?: number
  hasAudio?: boolean
  analysisFilePath?: string
}

export interface KeywordMoment {
  label: string
  timeSeconds: number | null
}

export interface AnalysisVideo {
  fileName: string
  relativePath: string
  folderRelativePath?: string
  durationSeconds?: number
  width?: number
  height?: number
  fps?: number
  hasAudio?: boolean
  title: string
  summary: string
  details: string[]
  categories: string[]
  keywords: string[]
  keywordMoments: KeywordMoment[]
  sampleImage?: string
  analysisFile?: string
  skippedFromExisting?: boolean
  absolutePath: string
  videoUrl: string
  analysisFilePath: string
  analysisMarkdown: string
  sampleImagePath: string
  sampleImageUrl: string
  generatedAt?: string
  model?: string
  reasoningEffort?: string
}

export interface AnalysisData {
  exists: boolean
  folderPath: string
  directVideoCount: number
  generatedAt?: string
  model?: string
  reasoningEffort?: string
  schemaVersion?: number
  videos: AnalysisVideo[]
}

export interface AnalysisProgress {
  exists: boolean
  folderPath: string
  status: string
  totalFiles: number
  reusableFiles: number
  completedFiles: number
  pendingFiles: number
  percent: number
  currentFile: string
  message: string
  updatedAt: string
}

export type AnalysisEvent =
  | {
      type: 'started'
      folderPath: string
      model: string
      reasoningEffort: string
    }
  | {
      type: 'log'
      stream: 'stdout' | 'stderr'
      message: string
    }
  | {
      type: 'completed'
      folderPath: string
      code: number
      finalMessage: string
      analysis: AnalysisData
    }
  | {
      type: 'failed'
      folderPath: string
      code: number | null
      error: string
      finalMessage: string
    }
  | {
      type: 'cancelled'
      folderPath: string
    }

export interface CodexRateLimitWindow {
  usedPercent: number | null
  windowMinutes: number | null
  resetsAt: number | null
}

export interface CodexTokenUsage {
  inputTokens: number | null
  cachedInputTokens: number | null
  outputTokens: number | null
  reasoningOutputTokens: number | null
  totalTokens: number | null
}

export interface CodexCredits {
  hasCredits: boolean | null
  unlimited: boolean | null
  balance: string | null
}

export interface CodexRateLimitsSnapshot {
  primary: CodexRateLimitWindow | null
  secondary: CodexRateLimitWindow | null
  limitId: string | null
  planType: string | null
  credits: CodexCredits | null
  totalTokenUsage: CodexTokenUsage | null
  lastTokenUsage: CodexTokenUsage | null
  modelContextWindow: number | null
  observedAt: string
  checkedAt: string
  sourceSessionId: string | null
}

export type AppEvent = {
  type: 'base-folder-selected'
  rootPath: string
  settings: ToolSettings
}

export interface EventsLogDownloadResult {
  ok: boolean
  cancelled?: boolean
  filePath?: string
}

export interface CodexVideoAnalyzerApi {
  getSettings: () => Promise<ToolSettings>
  saveSettings: (patch: Partial<ToolSettings>) => Promise<ToolSettings>
  getEnvironmentStatus: () => Promise<EnvironmentStatus>
  prepareEnvironment: (patch: Partial<ToolSettings>) => Promise<EnvironmentPreparationResult>
  pickRootFolder: () => Promise<string>
  scanFolders: (rootPath: string) => Promise<FolderItem[]>
  loadFolderTree: (rootPath: string) => Promise<FolderTreeNode | null>
  loadFolderVideos: (rootPath: string, folderPath: string) => Promise<FolderVideoItem[]>
  loadAnalysis: (folderPath: string) => Promise<AnalysisData>
  loadAnalysisProgress: (folderPath: string) => Promise<AnalysisProgress>
  startAnalysis: (folderPath: string) => Promise<{ ok: boolean }>
  cancelAnalysis: () => Promise<{ ok: boolean }>
  downloadEventsLog: () => Promise<EventsLogDownloadResult>
  startDragFile: (filePath: string, iconPath?: string) => void
  showItemInFolder: (targetPath: string) => Promise<boolean>
  openPath: (targetPath: string) => Promise<string>
  onAppEvent: (listener: (payload: AppEvent) => void) => () => void
  onAnalysisEvent: (listener: (payload: AnalysisEvent) => void) => () => void
  getCodexRateLimits: (options?: { force?: boolean }) => Promise<CodexRateLimitsSnapshot | null>
  onCodexRateLimitsUpdate: (listener: (payload: CodexRateLimitsSnapshot) => void) => () => void
}
