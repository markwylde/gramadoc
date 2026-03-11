import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import { incorrectPrepositionsRule } from './rule'

describe('incorrectPrepositionsRule', () => {
  it('flags a curated set of fixed-expression preposition mistakes', () => {
    const matches = runRule(
      incorrectPrepositionsRule,
      'We arrived to the station. I depend of my notes. She is interested on design. He is responsible of the rollout. They are married with each other. She is capable to lead. We focused in the API docs. This looks similar with the earlier draft. The guidance is related with the setup docs. The incident is associated to the release. She is comfortable to speaking in demos. The guard prevents users to logging in. I am used for working late. The docs section lives outside of the main guide. This approach feels different than the baseline. The change landed faster than I.',
    )

    expect(matches).toHaveLength(16)
    expect(matches[0]).toMatchObject({
      message: 'Use "arrived at" for destinations or places.',
      replacements: [{ value: 'at' }],
    })
    expect(matches[1].replacements).toEqual([{ value: 'on' }])
    expect(matches[2].replacements).toEqual([{ value: 'in' }])
    expect(matches[3].replacements).toEqual([{ value: 'for' }])
    expect(matches[4].replacements).toEqual([{ value: 'to' }])
    expect(matches[5].replacements).toEqual([{ value: 'of' }])
    expect(matches[6].replacements).toEqual([{ value: 'on' }])
    expect(matches[7].replacements).toEqual([{ value: 'to' }])
    expect(matches[8].replacements).toEqual([{ value: 'to' }])
    expect(matches[9].replacements).toEqual([{ value: 'with' }])
    expect(matches[10]).toMatchObject({
      message: 'Use "comfortable with" before a gerund.',
      replacements: [{ value: 'with' }],
    })
    expect(matches[11]).toMatchObject({
      message: 'Use "prevent ... from" before a gerund.',
      replacements: [{ value: 'from' }],
    })
    expect(matches[12]).toMatchObject({
      message: 'Use "used to" before a gerund when you mean accustomed to it.',
      replacements: [{ value: 'to' }],
    })
    expect(matches[13]).toMatchObject({
      message: 'In most prose, "outside" is tighter than "outside of".',
      replacements: [],
    })
    expect(matches[14]).toMatchObject({
      message: 'Use "different from" before a noun phrase.',
      replacements: [{ value: 'from' }],
    })
    expect(matches[15]).toMatchObject({
      message:
        'Use "than me" unless a following verb makes the clause explicit.',
      replacements: [{ value: 'me' }],
    })
  })

  it('does not flag the same phrases when the preposition is already correct', () => {
    expect(
      runRule(
        incorrectPrepositionsRule,
        'We arrived at the station. I depend on my notes. She is interested in design. He is responsible for the rollout. They are married to each other. She is capable of leading. We focused on the API docs. This looks similar to the earlier draft. The guidance is related to the setup docs. The incident is associated with the release. She is comfortable with speaking in demos. The guard prevents users from logging in. I am used to working late. The docs section lives outside the main guide. This looks different from the baseline. The change landed faster than me.',
      ),
    ).toEqual([])
  })

  it('does not flag when punctuation separates the words', () => {
    expect(
      runRule(incorrectPrepositionsRule, 'We arrived, to celebrate later.'),
    ).toEqual([])
  })

  it('limits gerund-style checks to actual gerund complements in prose and docs text', () => {
    expect(
      runRule(
        incorrectPrepositionsRule,
        'The onboarding guide says the speaker is comfortable in demos. The support note says the analyst is comfortable to speak during training. The script is used for logging requests. The update prevents users from login prompts. The final state was different than I expected.',
      ),
    ).toEqual([])
  })

  it('keeps quoted examples covered alongside prose fixtures', () => {
    const matches = runRule(
      incorrectPrepositionsRule,
      'The style guide calls out "arrive to" and says the presenter felt comfortable to speaking during the demo. The editorial note also mentions "outside of" as a wordy example.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0].replacements).toEqual([{ value: 'at' }])
    expect(matches[1].replacements).toEqual([{ value: 'with' }])
    expect(matches[2].replacements).toEqual([])
  })

  it('keeps clause-style and regional comparative follow-ups suppressed', () => {
    expect(
      runRule(
        incorrectPrepositionsRule,
        'The result felt different than I expected, and she moved faster than I did.',
      ),
    ).toEqual([])
  })
})
