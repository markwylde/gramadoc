import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  closedVsOpenCompoundsRule,
  contextualModifierHyphenRule,
  hyphenatedCompoundErrorsRule,
  missingHyphenRule,
  unnecessaryHyphenRule,
} from './rule'

describe('hyphenatedCompoundErrorsRule', () => {
  it('flags selected compound modifiers that should use hyphens', () => {
    const matches = runRule(
      hyphenatedCompoundErrorsRule,
      'The decision making process produced a high quality report.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0].replacements).toEqual([
      { value: 'decision-making process' },
    ])
    expect(matches[1].replacements).toEqual([{ value: 'high-quality report' }])
  })
})

describe('missingHyphenRule', () => {
  it('flags missing hyphens in known compounds', () => {
    const matches = runRule(
      missingHyphenRule,
      'She is a well known author in a full time role, a part time role, with an up to date guide for a cross functional team and a user friendly guide.',
    )

    expect(matches).toHaveLength(6)
    expect(matches[0].replacements).toEqual([{ value: 'well-known author' }])
    expect(matches[1].replacements).toEqual([{ value: 'full-time role' }])
    expect(matches[2].replacements).toEqual([{ value: 'part-time role' }])
    expect(matches[3].replacements).toEqual([{ value: 'up-to-date guide' }])
    expect(matches[4].replacements).toEqual([
      { value: 'cross-functional team' },
    ])
    expect(matches[5].replacements).toEqual([{ value: 'user-friendly guide' }])
  })
})

describe('unnecessaryHyphenRule', () => {
  it('flags unnecessary hyphens in closed compounds', () => {
    const matches = runRule(
      unnecessaryHyphenRule,
      'Please send an e-mail to your co-worker through the web-site from the work-flow review of the code-base before the log-in screen ships.',
    )

    expect(matches).toHaveLength(6)
    expect(matches[0].replacements).toEqual([{ value: 'email' }])
    expect(matches[1].replacements).toEqual([{ value: 'coworker' }])
    expect(matches[2].replacements).toEqual([{ value: 'website' }])
    expect(matches[3].replacements).toEqual([{ value: 'workflow' }])
    expect(matches[4].replacements).toEqual([{ value: 'codebase' }])
    expect(matches[5].replacements).toEqual([{ value: 'login' }])
  })
})

describe('contextualModifierHyphenRule', () => {
  it('flags open modifiers that should be hyphenated before a following noun', () => {
    const matches = runRule(
      contextualModifierHyphenRule,
      'We shipped real time updates, an end to end workflow, a long term roadmap, a cross platform app, a mobile first layout, a state of the art editor, an open source package, and a user friendly interface.',
    )

    expect(matches).toHaveLength(8)
    expect(matches[0].replacements).toEqual([{ value: 'real-time updates' }])
    expect(matches[1].replacements).toEqual([{ value: 'end-to-end workflow' }])
    expect(matches[2].replacements).toEqual([{ value: 'long-term roadmap' }])
    expect(matches[3].replacements).toEqual([{ value: 'cross-platform app' }])
    expect(matches[4].replacements).toEqual([{ value: 'mobile-first layout' }])
    expect(matches[5].replacements).toEqual([
      { value: 'state-of-the-art editor' },
    ])
    expect(matches[6].replacements).toEqual([{ value: 'open-source package' }])
    expect(matches[7].replacements).toEqual([
      { value: 'user-friendly interface' },
    ])
  })

  it('does not flag contextual modifiers at sentence boundaries or before non-head words', () => {
    expect(
      runRule(
        contextualModifierHyphenRule,
        'We need updates in real time. The checklist says end to end. The project is open source. The plan is long term.',
      ),
    ).toEqual([])
  })

  it('keeps open forms when they are not acting as noun modifiers', () => {
    expect(
      runRule(
        contextualModifierHyphenRule,
        'The dashboard updates in real time. The migration ran at large scale. The flow goes end to end. We can plan for the long term. The project lives in open source. We walked through the guide step by step.',
      ),
    ).toEqual([])
  })

  it('still flags allowed modifier phrases in list-like fragments with uncommon head-word tagging', () => {
    const matches = runRule(
      contextualModifierHyphenRule,
      'Checklist item: command line parser. Label: client side rendering. Phase: small scale rollout.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0].replacements).toEqual([{ value: 'command-line parser' }])
    expect(matches[1].replacements).toEqual([
      { value: 'client-side rendering' },
    ])
    expect(matches[2].replacements).toEqual([{ value: 'small-scale rollout' }])
  })

  it('covers docs-style headings, list items, and UI-label fragments', () => {
    const matches = runRule(
      contextualModifierHyphenRule,
      'Release checklist:\n- end to end tests\n- command line workflow\n- step by step guide\nUI label: short term workaround\nCard label: open source project',
    )

    expect(matches).toHaveLength(5)
    expect(matches[0].replacements).toEqual([{ value: 'end-to-end tests' }])
    expect(matches[1].replacements).toEqual([
      { value: 'command-line workflow' },
    ])
    expect(matches[2].replacements).toEqual([{ value: 'step-by-step guide' }])
    expect(matches[3].replacements).toEqual([
      { value: 'short-term workaround' },
    ])
    expect(matches[4].replacements).toEqual([{ value: 'open-source project' }])
  })
})

describe('closedVsOpenCompoundsRule', () => {
  it('flags open compounds that are normally closed', () => {
    const matches = runRule(
      closedVsOpenCompoundsRule,
      'The front end linked to the back end web site data base in a note book near the code base end point and work flow.',
    )

    expect(matches).toHaveLength(8)
    expect(matches[0].replacements).toEqual([{ value: 'frontend' }])
    expect(matches[1].replacements).toEqual([{ value: 'backend' }])
    expect(matches[2].replacements).toEqual([{ value: 'website' }])
    expect(matches[3].replacements).toEqual([{ value: 'database' }])
    expect(matches[4].replacements).toEqual([{ value: 'notebook' }])
    expect(matches[5].replacements).toEqual([{ value: 'codebase' }])
    expect(matches[6].replacements).toEqual([{ value: 'endpoint' }])
    expect(matches[7].replacements).toEqual([{ value: 'workflow' }])
  })

  it('does not flag compounds that are already closed', () => {
    expect(
      runRule(
        closedVsOpenCompoundsRule,
        'The frontend linked to the backend website in a database notebook at the endpoint of the workflow.',
      ),
    ).toEqual([])
  })
})
