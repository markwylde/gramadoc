import { describe, expect, it } from 'vitest'
import { analyzeHtml, buildRuleCheckContext } from '../../../utils'
import { runRule } from '../../testUtils'
import {
  ellipsisNormalizationRule,
  fileExtensionCasingRule,
  hashOfAbbreviationRule,
  hyphenUsedAsDashRule,
  ligatureNormalizationRule,
  otherPunctuationRules,
  repeatedColonRule,
  repeatedDashSeparatorRule,
  repeatedSemicolonRule,
  tightDoubleDashRule,
  unmatchedBracketRule,
} from './rule'

describe('repeatedSemicolonRule', () => {
  it('flags doubled semicolons', () => {
    const matches = runRule(
      repeatedSemicolonRule,
      'Bring apples;; oranges and bananas.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use a single semicolon here.',
      replacements: [{ value: ';' }],
    })
  })
})

describe('repeatedColonRule', () => {
  it('flags doubled colons in prose', () => {
    const matches = runRule(
      repeatedColonRule,
      'Remember this:: bring ID and notes.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use a single colon here.',
      replacements: [{ value: ':' }],
    })
  })
})

describe('dash rules', () => {
  it('flags triple hyphen separators between words', () => {
    const matches = runRule(
      repeatedDashSeparatorRule,
      'Wait---really? This should read more cleanly.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use a consistent dash separator here.',
      replacements: [{ value: '--' }],
    })
  })

  it('flags tight double dashes without surrounding spaces', () => {
    const matches = runRule(
      tightDoubleDashRule,
      'Wait--really? This should read more cleanly.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Add spaces around this dash separator.',
      replacements: [{ value: ' -- ' }],
    })
  })

  it('flags spaced hyphens used as parenthetical dashes', () => {
    const matches = runRule(
      hyphenUsedAsDashRule,
      'The release - after review - shipped.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use a double dash for this parenthetical break.',
      replacements: [{ value: ' -- ' }],
    })
  })

  it('does not treat html list markers as parenthetical dash breaks', () => {
    const matches = analyzeHtml('<ul><li>First step</li><li>Ship it.</li></ul>')
      .warnings.matches

    expect(
      matches.filter((match) => match.rule.id === hyphenUsedAsDashRule.id),
    ).toEqual([])
  })
})

describe('ellipsisNormalizationRule', () => {
  it('flags nonstandard ellipsis forms in prose', () => {
    const matches = runRule(
      ellipsisNormalizationRule,
      'I was waiting.. then the page loaded . . . eventually.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use a standard ellipsis here.',
      replacements: [{ value: '...' }],
    })
  })

  it('stays quiet in preformatted code-like blocks', () => {
    const matches = analyzeHtml(
      '<pre><code>Wait.. then run npm run build . . .</code></pre>',
    ).warnings.matches

    expect(
      matches.filter((match) => match.rule.id === ellipsisNormalizationRule.id),
    ).toEqual([])
  })

  it('does not flag decimal-style dot runs next to digits', () => {
    expect(
      ellipsisNormalizationRule.check(
        buildRuleCheckContext('Use the range 1..10 in this notation.'),
      ),
    ).toEqual([])
  })
})

describe('fileExtensionCasingRule', () => {
  it('flags uppercase file extensions in prose', () => {
    const matches = runRule(
      fileExtensionCasingRule,
      'Attach the report.PDF and diagram.SVG files.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use lowercase for common file extensions in prose.',
      replacements: [{ value: 'pdf' }],
    })
  })

  it('stays quiet in code-like blocks', () => {
    const matches = analyzeHtml(
      '<pre><code>mv REPORT.PDF archive/REPORT.PDF</code></pre>',
    ).warnings.matches

    expect(
      matches.filter((match) => match.rule.id === fileExtensionCasingRule.id),
    ).toEqual([])
  })
})

describe('ligatureNormalizationRule', () => {
  it('flags ligature characters in prose', () => {
    const matches = runRule(
      ligatureNormalizationRule,
      'This proﬁle shows an efﬁcient workﬂow.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      message: 'Replace this ligature with standard letters in prose.',
      replacements: [{ value: 'fi' }],
    })
  })

  it('stays quiet in code-like blocks', () => {
    const matches = analyzeHtml(
      '<pre><code>const proﬁle = buildProfile();</code></pre>',
    ).warnings.matches

    expect(
      matches.filter((match) => match.rule.id === ligatureNormalizationRule.id),
    ).toEqual([])
  })
})

describe('hashOfAbbreviationRule', () => {
  it('flags "# of" shorthand in prose', () => {
    const matches = runRule(
      hashOfAbbreviationRule,
      'Track the # of active users before launch.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Spell out "number of" instead of "# of" in prose.',
      replacements: [{ value: 'number of' }],
    })
  })

  it('stays quiet in markdown headings and code examples', () => {
    const headingMatches = analyzeHtml('<h2># of examples</h2>').warnings
      .matches
    const codeMatches = analyzeHtml(
      '<pre><code>printf "# of retries: %s"</code></pre>',
    ).warnings.matches

    expect(
      headingMatches.filter(
        (match) => match.rule.id === hashOfAbbreviationRule.id,
      ),
    ).toEqual([])
    expect(
      codeMatches.filter(
        (match) => match.rule.id === hashOfAbbreviationRule.id,
      ),
    ).toEqual([])
  })
})

describe('unmatchedBracketRule', () => {
  it('flags unmatched brackets', () => {
    const matches = runRule(
      unmatchedBracketRule,
      'Use the function call (value here and ] later.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'This closing bracket does not have a matching opener.',
    })
    expect(matches[1]).toMatchObject({
      message: 'This opening bracket appears to be missing its closing pair.',
    })
  })
})

describe('otherPunctuationRules', () => {
  it('exports the grouped other punctuation rules', () => {
    expect(otherPunctuationRules).toEqual([
      repeatedSemicolonRule,
      repeatedColonRule,
      repeatedDashSeparatorRule,
      tightDoubleDashRule,
      hyphenUsedAsDashRule,
      ellipsisNormalizationRule,
      fileExtensionCasingRule,
      ligatureNormalizationRule,
      hashOfAbbreviationRule,
      unmatchedBracketRule,
    ])
  })
})
