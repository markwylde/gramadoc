import { createBaseResponse } from '@markwylde/gramadoc'
import { startTransition, useEffect, useRef, useState } from 'react'
import type {
  DictionaryWorkerRequest,
  DictionaryWorkerResponse,
} from '../workers/dictionaryTypes'
import type { GrammerAnalysisResult, UseGrammerAnalysisOptions } from './types'

const EMPTY_WARNINGS = {
  ...createBaseResponse(),
  matches: [],
}

function createDefaultWorker() {
  return new Worker(
    new URL('../workers/dictionaryWorker.js', import.meta.url),
    {
      type: 'module',
    },
  )
}

/**
 * Analyzes editor HTML in a background worker and returns grammar metadata
 * that can be fed directly into {@link GramadocInput}.
 */
export function useGrammerAnalysis({
  value,
  workerFactory = createDefaultWorker,
}: UseGrammerAnalysisOptions): GrammerAnalysisResult {
  const workerRef = useRef<Worker | null>(null)
  const latestRequestId = useRef(0)
  const [state, setState] = useState<GrammerAnalysisResult>({
    warnings: EMPTY_WARNINGS,
    plainText: '',
    wordCounts: {},
    status: 'analyzing',
  })

  useEffect(() => {
    const worker = workerFactory()
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<DictionaryWorkerResponse>) => {
      const result = event.data

      if (result.requestId !== latestRequestId.current) {
        return
      }

      startTransition(() => {
        setState({
          warnings: result.warnings,
          plainText: result.plainText,
          wordCounts: result.wordCounts,
          status: 'ready',
        })
      })
    }

    worker.onerror = () => {
      setState((current) => ({
        ...current,
        status: 'error',
      }))
    }

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [workerFactory])

  useEffect(() => {
    if (!workerRef.current) {
      return
    }

    latestRequestId.current += 1

    setState((current) => ({
      ...current,
      status: 'analyzing',
    }))

    const request: DictionaryWorkerRequest = {
      requestId: latestRequestId.current,
      html: value,
    }

    workerRef.current.postMessage(request)
  }, [value])

  return state
}
