import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  nonstandardReflexivePronounRule,
  objectPronounAfterPrepositionRule,
  pronounsRules,
  reflexivePronounAsSubjectRule,
  subjectPronounAtSentenceStartRule,
} from './rule'

describe('objectPronounAfterPrepositionRule', () => {
  it('flags subject pronouns used after prepositions', () => {
    const matches = runRule(
      objectPronounAfterPrepositionRule,
      'The notes are for she. The decision is between you and I.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use "her" after the preposition "for".',
      replacements: [{ value: 'her' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use "me" after the preposition "between".',
      replacements: [{ value: 'me' }],
    })
  })

  it('does not flag correct object pronouns or punctuation-separated words', () => {
    expect(
      runRule(
        objectPronounAfterPrepositionRule,
        'The notes are for her. The decision is between you and me. We spoke with, I think, him later.',
      ),
    ).toEqual([])
  })
})

describe('subjectPronounAtSentenceStartRule', () => {
  it('flags object pronouns used as sentence subjects', () => {
    const matches = runRule(
      subjectPronounAtSentenceStartRule,
      'Me went home early. Them have the final copy.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use "I" as the subject here.',
      replacements: [{ value: 'I' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use "they" as the subject here.',
      replacements: [{ value: 'they' }],
    })
  })

  it('flags object pronouns used in compound subjects after "and"', () => {
    const matches = runRule(
      subjectPronounAtSentenceStartRule,
      'Sarah and me went home early. The reviewer and him were waiting outside.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use "I" in this compound subject.',
      replacements: [{ value: 'I' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use "he" in this compound subject.',
      replacements: [{ value: 'he' }],
    })
  })

  it('does not flag object pronouns used in compounds or object position', () => {
    expect(
      runRule(
        subjectPronounAtSentenceStartRule,
        'Me and Sarah went home early. She invited him later. I went home early.',
      ),
    ).toEqual([])
  })
})

describe('pronounsRules', () => {
  it('flags nonstandard reflexive pronouns in ordinary prose', () => {
    const matches = runRule(
      nonstandardReflexivePronounRule,
      'We should keep ourself aligned. They handled the rollout themself.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use "ourselves" in standard written English here.',
      replacements: [{ value: 'ourselves' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use "themselves" in standard written English here.',
      replacements: [{ value: 'themselves' }],
    })
  })

  it('does not flag quoted dialect uses of nonstandard reflexives', () => {
    expect(
      runRule(
        nonstandardReflexivePronounRule,
        'The transcript reads, "We kept ourself together." They kept themselves together afterward.',
      ),
    ).toEqual([])
  })

  it('stays quiet for singular-they antecedents and blockquoted dialect text', () => {
    expect(
      runRule(
        nonstandardReflexivePronounRule,
        'Someone may describe themself that way. We kept ourself together.',
        {
          blockRanges: [
            {
              index: 0,
              start: 0,
              end: 'Someone may describe themself that way.'.length,
              text: 'Someone may describe themself that way.',
              tagName: 'p',
              kind: 'paragraph',
            },
            {
              index: 1,
              start: 'Someone may describe themself that way. '.length,
              end: 'Someone may describe themself that way. We kept ourself together.'
                .length,
              text: 'We kept ourself together.',
              tagName: 'blockquote',
              kind: 'blockquote',
            },
          ],
        },
      ),
    ).toEqual([])
  })
})

describe('pronounsRules', () => {
  it('flags reflexive pronouns used as subjects', () => {
    const matches = runRule(
      reflexivePronounAsSubjectRule,
      'Myself went home early. Sarah and myself went home early.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use "I" instead of "Myself" as the subject here.',
      replacements: [{ value: 'I' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use "I" instead of "myself" in this compound subject.',
      replacements: [{ value: 'I' }],
    })
  })

  it('does not flag reflexive pronouns in emphatic or object uses', () => {
    expect(
      runRule(
        reflexivePronounAsSubjectRule,
        'I wrote the report myself. She invited Sarah and myself later.',
      ),
    ).toEqual([])
  })
})

describe('pronounsRules', () => {
  it('exports the grouped pronoun rules', () => {
    expect(pronounsRules).toEqual([
      objectPronounAfterPrepositionRule,
      subjectPronounAtSentenceStartRule,
      reflexivePronounAsSubjectRule,
      nonstandardReflexivePronounRule,
    ])
  })
})
