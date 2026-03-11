import type { AnalysisResponse } from '@markwylde/gramadoc'
import { analyzeHtml } from '@markwylde/gramadoc'
import type {
  DictionaryWorkerRequest,
  DictionaryWorkerResponse,
} from './dictionaryTypes'

const ANALYSIS_CACHE_LIMIT = 25
const analysisCache = new Map<
  string,
  {
    plainText: string
    wordCounts: Record<string, number>
    warnings: AnalysisResponse
  }
>()

function getCachedAnalysis(text: string) {
  const cached = analysisCache.get(text)

  if (!cached) {
    return null
  }

  analysisCache.delete(text)
  analysisCache.set(text, cached)
  return cached
}

function setCachedAnalysis(
  text: string,
  value: {
    plainText: string
    wordCounts: Record<string, number>
    warnings: AnalysisResponse
  },
) {
  if (analysisCache.has(text)) {
    analysisCache.delete(text)
  }

  analysisCache.set(text, value)

  if (analysisCache.size <= ANALYSIS_CACHE_LIMIT) {
    return
  }

  const oldestKey = analysisCache.keys().next().value

  if (oldestKey) {
    analysisCache.delete(oldestKey)
  }
}

function analyzeText(text: string) {
  const cached = getCachedAnalysis(text)

  if (cached) {
    return cached
  }

  const analysis = analyzeHtml(text)
  const result = {
    plainText: analysis.plainText,
    wordCounts: analysis.wordCounts,
    warnings: analysis.warnings satisfies AnalysisResponse,
  }

  setCachedAnalysis(text, result)
  return result
}

self.onmessage = (event: MessageEvent<DictionaryWorkerRequest>) => {
  const { requestId, html } = event.data
  const { plainText, wordCounts, warnings } = analyzeText(html)

  const response: DictionaryWorkerResponse = {
    requestId,
    plainText,
    wordCounts,
    warnings,
  }

  self.postMessage(response)
}
