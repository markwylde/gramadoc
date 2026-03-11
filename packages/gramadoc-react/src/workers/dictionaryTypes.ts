import type { AnalysisResponse } from '@markwylde/gramadoc'

export interface DictionaryWorkerRequest {
  requestId: number
  html: string
}

export interface DictionaryWorkerResponse {
  requestId: number
  plainText: string
  wordCounts: Record<string, number>
  warnings: AnalysisResponse
}
