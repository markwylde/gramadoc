import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  decadePluralRule,
  incorrectApostrophesRule,
  mixedApostropheStyleRule,
  namedPossessivePhraseRule,
  pluralPossessiveApostropheRule,
  possessiveItsRule,
  possessivePronounApostropheRule,
  splitContractionRule,
  whosContractionRule,
  whosePossessiveRule,
} from './rule'

describe('incorrectApostrophesRule', () => {
  it('flags common contractions written without apostrophes', () => {
    const matches = runRule(
      incorrectApostrophesRule,
      'I dont think youre ready for the release.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0].replacements).toEqual([{ value: "don't" }])
    expect(matches[1].replacements).toEqual([{ value: "you're" }])
  })

  it('covers a broader set of common omitted-apostrophe forms', () => {
    const matches = runRule(
      incorrectApostrophesRule,
      'Arent weve youll shouldve theres whos theyll theyve youd hed.',
    )

    expect(matches).toHaveLength(10)
    expect(matches.map((match) => match.replacements)).toEqual([
      [{ value: "Aren't" }],
      [{ value: "we've" }],
      [{ value: "you'll" }],
      [{ value: "should've" }],
      [{ value: "there's" }],
      [{ value: "who's" }],
      [{ value: "they'll" }],
      [{ value: "they've" }],
      [{ value: "you'd" }],
      [{ value: "he'd" }],
    ])
  })

  it('preserves title and uppercase casing in replacements', () => {
    const matches = runRule(incorrectApostrophesRule, 'Youll WEVE ITLL.')

    expect(matches).toHaveLength(3)
    expect(matches[0].replacements).toEqual([{ value: "You'll" }])
    expect(matches[1].replacements).toEqual([{ value: "WE'VE" }])
    expect(matches[2].replacements).toEqual([{ value: "IT'LL" }])
  })

  it('ignores unsupported casing and known dictionary words', () => {
    expect(runRule(incorrectApostrophesRule, 'YOUre welcome.')).toEqual([])
    expect(runRule(incorrectApostrophesRule, "You're welcome.")).toEqual([])
    expect(runRule(incorrectApostrophesRule, 'Ill shell well were.')).toEqual(
      [],
    )
  })
})

describe('splitContractionRule', () => {
  it('joins apostrophe-separated contractions back together', () => {
    const matches = runRule(
      splitContractionRule,
      "I 'm sure you 're ready because they 've said he 'd help and we 'll win.",
    )

    expect(matches).toHaveLength(5)
    expect(matches.map((match) => match.replacements)).toEqual([
      [{ value: "I'm" }],
      [{ value: "you're" }],
      [{ value: "they've" }],
      [{ value: "he'd" }],
      [{ value: "we'll" }],
    ])
  })

  it('joins split negative contractions, including irregular forms', () => {
    const matches = runRule(
      splitContractionRule,
      "That does n't fit, we ca n't leave, and they wo n't wait because it should n't fail.",
    )

    expect(matches).toHaveLength(4)
    expect(matches.map((match) => match.replacements)).toEqual([
      [{ value: "doesn't" }],
      [{ value: "can't" }],
      [{ value: "won't" }],
      [{ value: "shouldn't" }],
    ])
  })

  it('handles curly apostrophes and preserves casing', () => {
    const matches = runRule(
      splitContractionRule,
      'We ’ve checked and YOU ’RE up.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0].replacements).toEqual([{ value: "We've" }])
    expect(matches[1].replacements).toEqual([{ value: "YOU'RE" }])
  })

  it('ignores non-contraction apostrophe uses and already joined forms', () => {
    expect(
      runRule(
        splitContractionRule,
        "rock 'n' roll belongs in the users' guide, and we're done.",
      ),
    ).toEqual([])
  })
})

describe('possessiveItsRule', () => {
  it('flags "it\'s" when a possessive "its" is more likely', () => {
    const matches = runRule(
      possessiveItsRule,
      "The company changed it's policy. The phone lost it's battery cover.",
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use "its" for possession.',
      replacements: [{ value: 'its' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'its' }],
    })
  })

  it('does not flag genuine contractions', () => {
    expect(
      runRule(
        possessiveItsRule,
        "It's raining. It's been a long day. It's exciting.",
      ),
    ).toEqual([])
  })

  it('preserves capitalization in the replacement', () => {
    const matches = runRule(possessiveItsRule, "It's policy changed yesterday.")

    expect(matches).toHaveLength(1)
    expect(matches[0].replacements).toEqual([{ value: 'Its' }])
  })
})

describe('pluralPossessiveApostropheRule', () => {
  it('flags a curated set of plural possessive phrases with missing apostrophes', () => {
    const matches = runRule(
      pluralPossessiveApostropheRule,
      'The writers room met in the teachers lounge by the players entrance near the developers guide.',
    )

    expect(matches).toHaveLength(4)
    expect(matches[0]).toMatchObject({
      replacements: [{ value: "writers' room" }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: "teachers' lounge" }],
    })
    expect(matches[2]).toMatchObject({
      replacements: [{ value: "players' entrance" }],
    })
    expect(matches[3]).toMatchObject({
      replacements: [{ value: "developers' guide" }],
    })
  })

  it('does not flag phrases that already contain the apostrophe', () => {
    expect(
      runRule(
        pluralPossessiveApostropheRule,
        "The writers' room met in the teachers' lounge.",
      ),
    ).toEqual([])
  })
})

describe('possessivePronounApostropheRule', () => {
  it('flags possessive pronouns that wrongly use an apostrophe', () => {
    const matches = runRule(
      possessivePronounApostropheRule,
      "The final choice is your's, but the backup is their's and the shared draft is our's.",
    )

    expect(matches).toHaveLength(3)
    expect(matches[0].replacements).toEqual([{ value: 'yours' }])
    expect(matches[1].replacements).toEqual([{ value: 'theirs' }])
    expect(matches[2].replacements).toEqual([{ value: 'ours' }])
  })
})

describe('whosePossessiveRule', () => {
  it('flags who’s before likely possessed nouns', () => {
    const matches = runRule(
      whosePossessiveRule,
      "Who's idea was this, and who's responsibility is the launch?",
    )

    expect(matches).toHaveLength(2)
    expect(matches[0].replacements).toEqual([{ value: 'Whose' }])
    expect(matches[1].replacements).toEqual([{ value: 'whose' }])
  })

  it('stays quiet for contractions and technical identifier-like tokens', () => {
    expect(
      runRule(
        whosePossessiveRule,
        "Who's ready to ship, and who's API_KEY is this?",
      ),
    ).toEqual([])
  })
})

describe('whosContractionRule', () => {
  it("flags whose when who's is the likely contraction", () => {
    const matches = runRule(
      whosContractionRule,
      'Whose ready to ship, and whose responsible for the launch notes?',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0].replacements).toEqual([{ value: "Who's" }])
    expect(matches[1].replacements).toEqual([{ value: "who's" }])
  })

  it('stays quiet for genuine possessives', () => {
    expect(
      runRule(
        whosContractionRule,
        'Whose idea was this, and whose team owns the follow-up?',
      ),
    ).toEqual([])
  })
})

describe('decadePluralRule', () => {
  it('flags decade plurals that wrongly use an apostrophe', () => {
    const matches = runRule(
      decadePluralRule,
      "During the 1980's and in the 90's, documentation culture changed fast.",
    )

    expect(matches).toHaveLength(2)
    expect(matches[0].replacements).toEqual([{ value: '1980s' }])
    expect(matches[1].replacements).toEqual([{ value: '90s' }])
  })

  it('does not flag genuine year possessives', () => {
    expect(
      runRule(
        decadePluralRule,
        "The 1980's biggest release landed late, but the 1990s moved faster.",
      ),
    ).toEqual([])
  })
})

describe('namedPossessivePhraseRule', () => {
  it('flags curated holiday and event names with missing apostrophes', () => {
    const matches = runRule(
      namedPossessivePhraseRule,
      'The New Years Day release follows Mothers Day, Fathers Day, Valentines Day, and Saint Patricks Day planning.',
    )

    expect(matches).toHaveLength(5)
    expect(matches[0].replacements).toEqual([{ value: "New Year's Day" }])
    expect(matches[1].replacements).toEqual([{ value: "Mother's Day" }])
    expect(matches[2].replacements).toEqual([{ value: "Father's Day" }])
    expect(matches[3].replacements).toEqual([{ value: "Valentine's Day" }])
    expect(matches[4].replacements).toEqual([{ value: "Saint Patrick's Day" }])
  })
})

describe('mixedApostropheStyleRule', () => {
  it('flags a minority straight apostrophe in an otherwise curly document', () => {
    const matches = runRule(
      mixedApostropheStyleRule,
      "We’re aligned, it’s stable, they’ve tested it, but we're still documenting it.",
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use curly apostrophes consistently in this document.',
      replacements: [{ value: 'we’re' }],
    })
  })

  it('flags a minority curly apostrophe in an otherwise straight document', () => {
    const matches = runRule(
      mixedApostropheStyleRule,
      "We're aligned, it's stable, they've tested it, but we’re still documenting it.",
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use straight apostrophes consistently in this document.',
      replacements: [{ value: "we're" }],
    })
  })

  it('stays quiet for technical or ambiguous cases', () => {
    expect(
      runRule(
        mixedApostropheStyleRule,
        "We're shipping after O'Reilly signs off on USER'S_GUIDE and it's approved.",
      ),
    ).toEqual([])
    expect(
      runRule(
        mixedApostropheStyleRule,
        "We're aligned, it’s stable, and they've tested it.",
      ),
    ).toEqual([])
  })
})
