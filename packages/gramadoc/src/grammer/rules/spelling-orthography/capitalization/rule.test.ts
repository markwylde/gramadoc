import { describe, expect, it } from 'vitest'
import { analyzeHtml } from '../../../utils'
import { runRule } from '../../testUtils'
import {
  brandCapitalizationRule,
  capitalizationAfterPunctuationRule,
  capitalizationInHeadingsRule,
  incorrectAllCapsUsageRule,
  mixedCasingErrorsRule,
  properNounCapitalizationRule,
  sentenceCapitalizationRule,
  titleCapitalizationRule,
} from './rule'

describe('sentenceCapitalizationRule', () => {
  it('flags lowercase sentence starts, including after quotes and newlines', () => {
    const quotedMatches = runRule(
      sentenceCapitalizationRule,
      '"quoted" text should still begin with a capital.',
    )
    const newlineMatches = runRule(
      sentenceCapitalizationRule,
      'First line.\nsecond line starts lowercase.',
    )

    expect(quotedMatches).toHaveLength(1)
    expect(quotedMatches[0]).toMatchObject({
      message: 'Sentence should start with a capital letter.',
      offset: 1,
      length: 6,
      replacements: [{ value: 'Quoted' }],
    })

    expect(newlineMatches).toHaveLength(1)
    expect(newlineMatches[0]).toMatchObject({
      offset: 12,
      length: 6,
      replacements: [{ value: 'Second' }],
    })
  })

  it('ignores leading whitespace and punctuation before an uppercase start', () => {
    expect(
      runRule(
        sentenceCapitalizationRule,
        '  ("Quoted") Sentences can still begin with a capital.',
      ),
    ).toEqual([])
  })

  it('does not treat punctuation inside email addresses and urls as sentence boundaries', () => {
    expect(
      runRule(
        sentenceCapitalizationRule,
        'My email address is mark@wex.com and the docs are at https://wex.com/docs.',
      ),
    ).toEqual([])
  })

  it('does not flag lowercase dialogue tags after quoted questions', () => {
    expect(
      runRule(
        sentenceCapitalizationRule,
        '"Dario, why are you not talking to me?" said Aron.',
      ),
    ).toEqual([])
  })

  it('does not treat sentence-internal abbreviations like a.m. as a new sentence', () => {
    expect(
      runRule(
        sentenceCapitalizationRule,
        'We met at 10 a.m. and then left for lunch.',
      ),
    ).toEqual([])
    expect(
      runRule(
        sentenceCapitalizationRule,
        'Use e.g. and i.e. carefully in these notes.',
      ),
    ).toEqual([])
  })

  it('still respects real sentence boundaries after abbreviations when the next sentence is capitalized', () => {
    expect(
      runRule(
        sentenceCapitalizationRule,
        'We met at 10 a.m. Then we left for lunch.',
      ),
    ).toEqual([])
  })

  it('handles Unicode lowercase sentence starts safely', () => {
    const matches = runRule(sentenceCapitalizationRule, 'élan helps here.')

    expect(matches).toHaveLength(1)
    expect(matches[0].replacements).toEqual([{ value: 'Élan' }])
  })

  it('does not flag official lower-leading brand casing at sentence start', () => {
    expect(
      runRule(
        sentenceCapitalizationRule,
        'iPhone sales increased after the launch.',
      ),
    ).toEqual([])
  })
})

describe('properNounCapitalizationRule', () => {
  it('flags lowercase proper nouns from the demo lexicon', () => {
    const matches = runRule(
      properNounCapitalizationRule,
      'We met in london on monday in january. The team shipped updates across europe before christmas.',
    )

    expect(matches).toHaveLength(5)
    expect(matches[0].replacements).toEqual([{ value: 'London' }])
    expect(matches[1].replacements).toEqual([{ value: 'Monday' }])
    expect(matches[2].replacements).toEqual([{ value: 'January' }])
    expect(matches[3].replacements).toEqual([{ value: 'Europe' }])
    expect(matches[4].replacements).toEqual([{ value: 'Christmas' }])
  })

  it('handles context-sensitive month names only in date-like contexts', () => {
    const matches = runRule(
      properNounCapitalizationRule,
      'We launch in march 2026 and review the report in may. Engineers may prefer a smaller patch.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0].replacements).toEqual([{ value: 'March' }])
    expect(matches[1].replacements).toEqual([{ value: 'May' }])
  })

  it('suppresses sentence-initial ambiguity and code-adjacent tokens', () => {
    expect(
      runRule(
        properNounCapitalizationRule,
        'We moved to london, but `london` stays literal in code and march can stay lowercase when it is a verb.',
      ),
    ).toEqual([
      expect.objectContaining({
        replacements: [{ value: 'London' }],
      }),
    ])
  })
})

describe('titleCapitalizationRule', () => {
  it('flags known titles written in lowercase', () => {
    const matches = runRule(
      titleCapitalizationRule,
      'We studied the great gatsby before class.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Capitalize the title as "The Great Gatsby".',
      replacements: [{ value: 'The Great Gatsby' }],
    })
  })

  it('does not flag titles that are already capitalized correctly', () => {
    expect(
      runRule(titleCapitalizationRule, 'We studied The Great Gatsby.'),
    ).toEqual([])
  })
})

describe('capitalizationAfterPunctuationRule', () => {
  it('flags lowercase starts after a colon', () => {
    const matches = runRule(
      capitalizationAfterPunctuationRule,
      'Remember this: start with a capital.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0].replacements).toEqual([{ value: 'Start' }])
  })
})

describe('incorrectAllCapsUsageRule', () => {
  it('flags all-caps words in running text but not acronyms', () => {
    const matches = runRule(
      incorrectAllCapsUsageRule,
      'This sentence is VERY loud but the API is fine.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Avoid all-caps styling for "VERY" in running text.',
      replacements: [{ value: 'very' }],
    })
  })
})

describe('mixedCasingErrorsRule', () => {
  it('flags inconsistent mixed-case words while preserving brands', () => {
    const matches = runRule(
      mixedCasingErrorsRule,
      'The eXaMpLe looked odd, but OpenAI looked fine.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0].replacements).toEqual([{ value: 'example' }])
  })

  it('does not flag pluralized acronyms written with a lowercase suffix', () => {
    expect(
      runRule(
        mixedCasingErrorsRule,
        'PCs were everywhere. APIs changed quickly. URLs were shorter then.',
      ),
    ).toEqual([])
  })
})

describe('brandCapitalizationRule', () => {
  it('flags brand names that use the wrong casing', () => {
    const matches = runRule(
      brandCapitalizationRule,
      'We used github, youtube, and openai on an iphone while discussing javascript.',
    )

    expect(matches).toHaveLength(5)
    expect(matches[0].replacements).toEqual([{ value: 'GitHub' }])
    expect(matches[1].replacements).toEqual([{ value: 'YouTube' }])
    expect(matches[2].replacements).toEqual([{ value: 'OpenAI' }])
    expect(matches[3].replacements).toEqual([{ value: 'iPhone' }])
    expect(matches[4].replacements).toEqual([{ value: 'JavaScript' }])
  })

  it('ignores sentence-start and code-adjacent brand tokens', () => {
    expect(
      runRule(
        brandCapitalizationRule,
        'OpenAI announced the launch. Use `openai` in this literal example.',
      ),
    ).toEqual([])
  })
})

describe('capitalizationInHeadingsRule', () => {
  it('flags lowercase and uppercase heading-style lines', () => {
    const matches = runRule(
      capitalizationInHeadingsRule,
      'meeting notes\nPROJECT UPDATE\nThis sentence is fine.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0].replacements).toEqual([{ value: 'Meeting Notes' }])
    expect(matches[1].replacements).toEqual([{ value: 'Project Update' }])
  })

  it('does not flag normal sentences with punctuation', () => {
    expect(
      runRule(capitalizationInHeadingsRule, 'meeting notes are here.'),
    ).toEqual([])
  })

  it('uses HTML heading block metadata instead of treating all short lines alike', () => {
    const matches = analyzeHtml(
      '<h2>meeting notes</h2><p>This paragraph is fine.</p>',
    ).warnings.matches.filter(
      (match) => match.rule.id === capitalizationInHeadingsRule.id,
    )

    expect(matches).toHaveLength(1)
    expect(matches[0].replacements).toEqual([{ value: 'Meeting Notes' }])
  })

  it('lets the heading rule own all-caps headings without a duplicate running-text warning', () => {
    const matches = analyzeHtml('<h2>PROJECT UPDATE</h2>').warnings.matches

    expect(matches.map((match) => match.rule.id)).toContain(
      capitalizationInHeadingsRule.id,
    )
    expect(matches.map((match) => match.rule.id)).not.toContain(
      incorrectAllCapsUsageRule.id,
    )
  })
})
