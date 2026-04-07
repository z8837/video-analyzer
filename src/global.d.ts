import type { CodexVideoAnalyzerApi } from './types'

declare global {
  interface Window {
    codexVideoAnalyzer: CodexVideoAnalyzerApi
  }
}

export {}
