import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  chatShorthandRule,
  informalContractionRule,
  informalityToneRules,
  mildProfanityRule,
  offensiveLanguageRule,
} from './rule'

describe('chatShorthandRule', () => {
  it('flags curated chat abbreviations and nonstandard shorthand in lowercase prose', () => {
    const matches = runRule(
      chatShorthandRule,
      'pls review the draft, btw idk if the client said thx. dat note helps dis team, and ppl luv it.',
    )

    expect(matches).toHaveLength(8)
    expect(matches[0]).toMatchObject({
      message: 'Replace this chat shorthand with standard prose.',
      replacements: [{ value: 'please' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'by the way' }],
    })
    expect(matches[2]).toMatchObject({
      replacements: [{ value: 'I do not know' }],
    })
    expect(matches[3]).toMatchObject({
      replacements: [{ value: 'thanks' }],
    })
    expect(matches[4]).toMatchObject({
      replacements: [{ value: 'that' }],
    })
    expect(matches[5]).toMatchObject({
      replacements: [{ value: 'this' }],
    })
    expect(matches[6]).toMatchObject({
      replacements: [{ value: 'people' }],
    })
    expect(matches[7]).toMatchObject({
      replacements: [{ value: 'love' }],
    })
  })

  it('does not flag uppercase acronyms, quoted examples, or standard prose', () => {
    expect(
      runRule(
        chatShorthandRule,
        'IMO, the acronym is acceptable in this heading, and "idk" is only mentioned as an example.',
      ),
    ).toEqual([])
  })
})

describe('informalContractionRule', () => {
  it('flags curated informal spoken contractions and reductions', () => {
    const matches = runRule(
      informalContractionRule,
      'We are gonna finish this, and they kinda know it. Lemme check, gimme a minute, and move outta the way.',
    )

    expect(matches).toHaveLength(5)
    expect(matches[0]).toMatchObject({
      message: 'Use a less informal phrasing here.',
      replacements: [{ value: 'going to' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'kind of' }],
    })
    expect(matches[2]).toMatchObject({
      replacements: [{ value: 'Let me' }],
    })
    expect(matches[3]).toMatchObject({
      replacements: [{ value: 'give me' }],
    })
    expect(matches[4]).toMatchObject({
      replacements: [{ value: 'out of' }],
    })
  })

  it('does not flag the standard longer forms or quoted slang examples', () => {
    expect(
      runRule(
        informalContractionRule,
        'We are going to finish this, and they kind of know it. The docs mention "gonna" only as an example.',
      ),
    ).toEqual([])
  })
})

describe('informalityToneRules', () => {
  it('flags mild profanity in neutral prose but suppresses policy and quoted contexts', () => {
    const matches = runRule(
      mildProfanityRule,
      'This damn workflow turned into a crap show after the build hit a shit error.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      message: 'Prefer a more neutral intensifier here.',
      replacements: [{ value: 'very' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Prefer a more neutral word here.',
      replacements: [{ value: 'issue' }],
    })
    expect(matches[2]).toMatchObject({
      message: 'Replace this profanity with a more neutral word.',
      replacements: [{ value: 'problem' }],
    })

    expect(
      runRule(
        mildProfanityRule,
        'The moderation policy lists "shit" as a blocked term, and the docs explain when "damn" should be filtered.',
      ),
    ).toEqual([])
  })

  it('flags offensive terms while staying quiet for documentation and educational contexts', () => {
    const matches = runRule(
      offensiveLanguageRule,
      'That ghetto workaround feels retarded, and the gypped customer deserves a fix.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      message: 'Avoid this potentially offensive term here.',
      replacements: [{ value: 'makeshift' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Avoid this offensive term here.',
      replacements: [{ value: 'broken' }],
    })
    expect(matches[2]).toMatchObject({
      message: 'Avoid this offensive term here.',
      replacements: [{ value: 'cheated' }],
    })

    expect(
      runRule(
        offensiveLanguageRule,
        'The policy explains why "retarded" and "gypped" are blocked terms, and the docs call "crazy" potentially ableist.',
      ),
    ).toEqual([])
  })

  it('exports the grouped informality and tone rules', () => {
    expect(informalityToneRules).toEqual([
      chatShorthandRule,
      informalContractionRule,
      mildProfanityRule,
      offensiveLanguageRule,
    ])
  })
})
