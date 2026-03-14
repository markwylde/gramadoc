import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  doSupportBaseVerbRule,
  infinitiveBaseVerbRule,
  irregularPastParticipleRule,
  modalHaveRule,
  needsParticipleEllipsisRule,
  questionLeadBaseVerbRule,
  sentenceInitialSubjectDropRule,
  usedToModalStackRule,
  verbUsageRules,
} from './rule'

describe('modalHaveRule', () => {
  it('flags modal phrases that incorrectly use "of"', () => {
    const matches = runRule(
      modalHaveRule,
      'We should of left earlier. They might of missed the train.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use "have" after "should".',
      replacements: [{ value: 'have' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use "have" after "might".',
      replacements: [{ value: 'have' }],
    })
  })

  it('does not flag correct modal perfect forms', () => {
    expect(
      runRule(
        modalHaveRule,
        'We should have left earlier. They might have missed the train.',
      ),
    ).toEqual([])
  })
})

describe('irregularPastParticipleRule', () => {
  it('flags simple perfect constructions that use the wrong irregular form', () => {
    const matches = runRule(
      irregularPastParticipleRule,
      'She has went home already. They had wrote the summary before lunch.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use the past participle "gone" after "has".',
      replacements: [{ value: 'gone' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use the past participle "written" after "had".',
      replacements: [{ value: 'written' }],
    })
  })

  it('does not flag correct past participles', () => {
    expect(
      runRule(
        irregularPastParticipleRule,
        'She has gone home already. They had written the summary before lunch.',
      ),
    ).toEqual([])
  })

  it('flags bare irregular participles when a finite past tense is expected', () => {
    const matches = runRule(
      irregularPastParticipleRule,
      'Residents say they seen thick smoke covering the sky.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use the simple past "saw" here instead of the participle "seen".',
      replacements: [{ value: 'saw' }],
    })
  })
})

describe('doSupportBaseVerbRule', () => {
  it('flags curated non-base verbs after do-support auxiliaries', () => {
    const matches = runRule(
      doSupportBaseVerbRule,
      'Did she went yesterday? Does he writes every morning? Do they goes now?',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      message: 'Use the base verb "go" after "Did".',
      replacements: [{ value: 'go' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use the base verb "write" after "Does".',
      replacements: [{ value: 'write' }],
    })
    expect(matches[2]).toMatchObject({
      message: 'Use the base verb "go" after "Do".',
      replacements: [{ value: 'go' }],
    })
  })

  it('does not flag correct base forms after do-support auxiliaries', () => {
    expect(
      runRule(
        doSupportBaseVerbRule,
        'Did she go yesterday? Does he write every morning? Do they go now?',
      ),
    ).toEqual([])
  })

  it('recovers regular base verbs without relying on a rule-local stemmer', () => {
    const matches = runRule(
      doSupportBaseVerbRule,
      'Did she studied more? Does he agreed too quickly?',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      replacements: [{ value: 'study' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'agree' }],
    })
  })

  it('handles contracted do-support forms', () => {
    const matches = runRule(
      doSupportBaseVerbRule,
      "Warnings didn't came early enough.",
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      replacements: [{ value: 'come' }],
    })
  })
})

describe('infinitiveBaseVerbRule', () => {
  it('flags regular and irregular verb forms after infinitive "to"', () => {
    const matches = runRule(
      infinitiveBaseVerbRule,
      'Sometimes I like to walked to the shops. They want to went home early. We tried to studied more. They hoped to agreed too quickly.',
    )

    expect(matches).toHaveLength(4)
    expect(matches[0]).toMatchObject({
      message: 'Use the base verb "walk" after "to".',
      replacements: [{ value: 'walk' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use the base verb "go" after "to".',
      replacements: [{ value: 'go' }],
    })
    expect(matches[2]).toMatchObject({
      message: 'Use the base verb "study" after "to".',
      replacements: [{ value: 'study' }],
    })
    expect(matches[3]).toMatchObject({
      message: 'Use the base verb "agree" after "to".',
      replacements: [{ value: 'agree' }],
    })
  })

  it('does not flag correct infinitives or prepositional "to" phrases', () => {
    expect(
      runRule(
        infinitiveBaseVerbRule,
        'Sometimes I like to walk to the shops. We drove to London yesterday. Sometimes I think that I need to want to need to do the right thing.',
      ),
    ).toEqual([])
  })

  it('flags modal contexts that still require a base verb', () => {
    const matches = runRule(
      infinitiveBaseVerbRule,
      'Safety should always comes first while crews continue battling the flames.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      replacements: [{ value: 'come' }],
    })
  })

  it('stays quiet for ambiguous or quoted examples even when the surface looks non-base', () => {
    expect(
      runRule(
        infinitiveBaseVerbRule,
        'We need to read the memo. The guide quoted "to agreed" as a learner error.',
      ),
    ).toEqual([])
  })

  it('adds confidence and diagnostics from shared morphology to infinitive matches', () => {
    const matches = runRule(
      infinitiveBaseVerbRule,
      'They hoped to agreed too quickly.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      confidenceLabel: 'high',
      diagnostics: {
        annotationConfidence: 'high',
        triggerTokens: ['to', 'agreed'],
      },
    })
  })
})

describe('questionLeadBaseVerbRule', () => {
  it('flags non-base verbs after sentence-leading "why" questions', () => {
    const matches = runRule(
      questionLeadBaseVerbRule,
      'Why walked down the street, when you can run? Why went home so early?',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use the base verb "walk" after "Why".',
      replacements: [{ value: 'walk' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use the base verb "go" after "Why".',
      replacements: [{ value: 'go' }],
    })
  })

  it('does not flag correct "why" questions that already use a base verb', () => {
    expect(
      runRule(
        questionLeadBaseVerbRule,
        'Why walk down the street when you can run? Why go home so early?',
      ),
    ).toEqual([])
  })

  it('does not flag quoted question fragments that are being discussed', () => {
    expect(
      runRule(
        questionLeadBaseVerbRule,
        'The handout highlighted "Why went home so early?" as the incorrect version.',
      ),
    ).toEqual([])
  })
})

describe('verb usage diagnostics', () => {
  it('adds confidence and diagnostics to irregular participle matches', () => {
    const matches = runRule(
      irregularPastParticipleRule,
      'She has went home already.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      confidenceLabel: 'high',
      diagnostics: {
        annotationConfidence: 'high',
        triggerTokens: ['has', 'went'],
      },
    })
  })
})

describe('needsParticipleEllipsisRule', () => {
  it('flags regional ellipsis patterns like "needs fixed" in prose', () => {
    const matches = runRule(
      needsParticipleEllipsisRule,
      'The draft needs fixed before publishing. The hallway needs cleaned before guests arrive. The page needed updated before launch.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      message:
        'Prefer a standard form such as "needs to be fixed" or "needs fixing" here.',
      replacements: [{ value: 'needs to be fixed' }, { value: 'needs fixing' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [
        { value: 'needs to be cleaned' },
        { value: 'needs cleaning' },
      ],
    })
    expect(matches[2]).toMatchObject({
      replacements: [
        { value: 'needed to be updated' },
        { value: 'needed updating' },
      ],
    })
  })

  it('does not flag quoted or already standard rewrites', () => {
    expect(
      runRule(
        needsParticipleEllipsisRule,
        'The transcript reads, "The draft needs fixed." The draft needs to be fixed before publishing.',
      ),
    ).toEqual([])
  })

  it('does not flag blockquoted regional ellipsis examples', () => {
    const text = 'The draft needs fixed before publishing.'

    expect(
      runRule(needsParticipleEllipsisRule, text, {
        blockRanges: [
          {
            index: 0,
            start: 0,
            end: text.length,
            text,
            tagName: 'blockquote',
            kind: 'blockquote',
          },
        ],
      }),
    ).toEqual([])
  })
})

describe('usedToModalStackRule', () => {
  it('flags regional double-modal stacks in prose', () => {
    const matches = runRule(
      usedToModalStackRule,
      'I used to could finish that in an hour. We used to would stay out late in summer.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message:
        'Prefer "could" or "used to" instead of "used to could" in standard prose.',
      replacements: [{ value: 'could' }, { value: 'used to' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'would' }, { value: 'used to' }],
    })
  })

  it('does not flag quoted dialect or ordinary modal phrasing', () => {
    expect(
      runRule(
        usedToModalStackRule,
        'The interview quoted her saying, "I used to could do that." I could do that years ago.',
      ),
    ).toEqual([])
  })

  it('does not flag blockquoted dialect examples', () => {
    const text = 'I used to could do that.'

    expect(
      runRule(usedToModalStackRule, text, {
        blockRanges: [
          {
            index: 0,
            start: 0,
            end: text.length,
            text,
            tagName: 'blockquote',
            kind: 'blockquote',
          },
        ],
      }),
    ).toEqual([])
  })
})

describe('sentenceInitialSubjectDropRule', () => {
  it('flags narrowly scoped sentence-leading subject-drop fragments in prose', () => {
    const matches = runRule(
      sentenceInitialSubjectDropRule,
      'Seems like the deploy failed overnight. Appears that the queue is stuck.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message:
        'Add an explicit subject in standard prose, such as "It seems like ...".',
      replacements: [{ value: 'It seems like' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'It appears that' }],
    })
  })

  it('does not flag explicit-subject versions or quoted dialogue', () => {
    expect(
      runRule(
        sentenceInitialSubjectDropRule,
        'It seems like the deploy failed overnight. The transcript reads, "Seems like the deploy failed overnight."',
      ),
    ).toEqual([])
  })

  it('does not flag the fragment in creative-writing packs', () => {
    expect(
      runRule(
        sentenceInitialSubjectDropRule,
        'Seems like the valley kept its own time.',
        {
          optionalRulePacks: {
            creativeWriting: {
              ePrime: 'loose',
            },
          },
        },
      ),
    ).toEqual([])
  })

  it('does not flag headings, list items, or blockquoted fragments', () => {
    const headingText = 'Seems like release drift'
    const listItemText = 'Appears that the queue is stuck'
    const blockquoteText = 'Seems like the deploy failed overnight.'

    expect(
      runRule(sentenceInitialSubjectDropRule, headingText, {
        blockRanges: [
          {
            index: 0,
            start: 0,
            end: headingText.length,
            text: headingText,
            tagName: 'h2',
            kind: 'heading',
          },
        ],
      }),
    ).toEqual([])
    expect(
      runRule(sentenceInitialSubjectDropRule, listItemText, {
        blockRanges: [
          {
            index: 0,
            start: 0,
            end: listItemText.length,
            text: listItemText,
            tagName: 'li',
            kind: 'list-item',
          },
        ],
      }),
    ).toEqual([])
    expect(
      runRule(sentenceInitialSubjectDropRule, blockquoteText, {
        blockRanges: [
          {
            index: 0,
            start: 0,
            end: blockquoteText.length,
            text: blockquoteText,
            tagName: 'blockquote',
            kind: 'blockquote',
          },
        ],
      }),
    ).toEqual([])
  })
})

describe('verbUsageRules', () => {
  it('exports the grouped verb usage rules', () => {
    expect(verbUsageRules).toEqual([
      modalHaveRule,
      irregularPastParticipleRule,
      doSupportBaseVerbRule,
      infinitiveBaseVerbRule,
      questionLeadBaseVerbRule,
      needsParticipleEllipsisRule,
      usedToModalStackRule,
      sentenceInitialSubjectDropRule,
    ])
  })
})
