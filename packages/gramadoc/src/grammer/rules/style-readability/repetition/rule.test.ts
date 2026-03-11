import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  overusedAdjectiveRule,
  overusedNounRule,
  overusedVerbRule,
  repeatedParagraphOpeningRule,
  repeatedPhraseRule,
  repeatedSentenceOpeningRule,
  repeatedWordRule,
} from './rule'

describe('repeatedWordRule', () => {
  it('flags repeated words separated only by whitespace', () => {
    const matches = runRule(
      repeatedWordRule,
      'This is the the repeated word example.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Repeated word: "the".',
      offset: 11,
      length: 4,
      replacements: [{ value: '' }],
      sentence: 'This is the the repeated word example',
    })
  })
})

describe('repeatedPhraseRule', () => {
  it('flags immediately repeated phrases', () => {
    const matches = runRule(
      repeatedPhraseRule,
      'This is a very good a very good example.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Repeated phrase: "a very good".',
      offset: 19,
      length: 12,
      replacements: [{ value: '' }],
    })
  })
})

describe('repeatedSentenceOpeningRule', () => {
  it('flags adjacent sentences with the same opening', () => {
    const matches = runRule(
      repeatedSentenceOpeningRule,
      'This guide explains setup. This guide covers deployment next.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message:
        'These adjacent sentences start the same way. Vary the opening for better flow.',
    })
  })
})

describe('repeatedParagraphOpeningRule', () => {
  it('flags adjacent paragraphs with the same opening', () => {
    const matches = runRule(
      repeatedParagraphOpeningRule,
      'This guide explains setup.\n\nThis guide covers deployment.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message:
        'These adjacent paragraphs start the same way. Consider varying the opening.',
    })
  })
})

describe('overusedVerbRule', () => {
  it('flags repeated lexical verbs across a document', () => {
    const matches = runRule(
      overusedVerbRule,
      'We improve the draft, improve the examples, improve the checklist, and improve the closing section.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message:
        'The verb "improve" appears 4 times. Consider varying the action or trimming repetition.',
    })
  })

  it('ignores low-signal functional verbs', () => {
    const matches = runRule(
      overusedVerbRule,
      'We use the tool, use the guide, use the page, and use the workflow every day.',
    )

    expect(matches).toHaveLength(0)
  })
})

describe('overusedNounRule', () => {
  it('flags repeated general nouns', () => {
    const matches = runRule(
      overusedNounRule,
      'The process broke the process because the process wrapped another process inside the process.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message:
        'The noun "process" appears 5 times. Consider repeating it less or replacing some instances with a clearer alternative.',
    })
  })

  it('suppresses repeated technical terminology by default', () => {
    const matches = runRule(
      overusedNounRule,
      'The API documents the API because the API schema keeps the API response aligned with the API client.',
    )

    expect(matches).toHaveLength(0)
  })

  it('stays quiet for repeated ambiguous tokens that still rely on weak noun evidence', () => {
    const matches = runRule(
      overusedNounRule,
      'The system works well, scales well, reads well, and performs well in production.',
    )

    expect(matches).toHaveLength(0)
  })
})

describe('overusedAdjectiveRule', () => {
  it('flags repeated adjectives', () => {
    const matches = runRule(
      overusedAdjectiveRule,
      'It is flexible software with flexible defaults, flexible workflows, and flexible review steps.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message:
        'The adjective "flexible" appears 4 times. Consider varying the description so the prose stays sharper.',
    })
  })

  it('keeps documentation adjectives quiet when they are allowlisted or low-signal', () => {
    const matches = runRule(
      overusedAdjectiveRule,
      'The guide is useful and the examples stay useful while the checklist remains useful in support docs.',
    )

    expect(matches).toHaveLength(0)
  })
})
