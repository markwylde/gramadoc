import { readFileSync } from 'node:fs'
import { describe, it } from 'vitest'
import { analyzeText } from './utils'

type ExpectedDocumentProblem = {
  ruleId: string
  offset: number
  length: number
  excerpt: string
  note: string
}

const documentIds = ['1', '2', '3', '4'] as const

type DocumentId = (typeof documentIds)[number]

function readDocumentFile(documentId: DocumentId, extension: 'txt' | 'json') {
  return readFileSync(
    new URL(
      `../../tests/documents/${documentId}.${extension}`,
      import.meta.url,
    ),
    'utf8',
  )
}

describe('document gap corpus', () => {
  it.each(
    documentIds,
  )('catches the curated whole-document gaps in %s.txt', (documentId) => {
    const text = readDocumentFile(documentId, 'txt')
    const expectedProblems = JSON.parse(
      readDocumentFile(documentId, 'json'),
    ) as ExpectedDocumentProblem[]

    const actualMatches = analyzeText(text).warnings.matches
    const actualMatchKeys = new Set(
      actualMatches.map(
        (match) => `${match.rule.id}:${match.offset}:${match.length}`,
      ),
    )

    for (const problem of expectedProblems) {
      const actualExcerpt = text.slice(
        problem.offset,
        problem.offset + problem.length,
      )

      if (actualExcerpt !== problem.excerpt) {
        throw new Error(
          `Fixture drift in ${documentId}.json at ${problem.offset}: expected excerpt ` +
            `"${problem.excerpt}" but found "${actualExcerpt}".`,
        )
      }
    }

    const missingProblems = expectedProblems.filter(
      (problem) =>
        !actualMatchKeys.has(
          `${problem.ruleId}:${problem.offset}:${problem.length}`,
        ),
    )

    if (missingProblems.length > 0) {
      throw new Error(
        `${documentId}.txt is still missing ${missingProblems.length} realistically catchable problems:\n` +
          missingProblems
            .map(
              (problem) =>
                `- ${problem.ruleId} at ${problem.offset} ("${problem.excerpt}"): ${problem.note}`,
            )
            .join('\n'),
      )
    }
  })
})
