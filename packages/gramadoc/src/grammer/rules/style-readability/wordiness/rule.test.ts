import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  ableToBeRule,
  houseStyleWordingRule,
  longParagraphRule,
  longSentenceRule,
  nominalizationPileupRule,
  nounStackRule,
  overusedWordRule,
  passiveVoiceRule,
  redundantPhraseRule,
  sentenceFinalReadabilityRule,
  sentenceInitialReadabilityRule,
  sentenceStartNumberRule,
  technicalNounClusterRule,
  wordinessRules,
  wordyPhraseRule,
  wordyPhraseSuggestionRule,
} from './rule'

describe('redundantPhraseRule', () => {
  it('flags curated redundant phrases', () => {
    const matches = runRule(
      redundantPhraseRule,
      'We reviewed the basic fundamentals and our future plans. Each and every person agreed.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      message: 'The phrase "basic fundamentals" is redundant.',
      replacements: [{ value: 'fundamentals' }],
    })
  })

  it('covers a broader redundancy tranche across prose and docs-style wording', () => {
    const matches = runRule(
      redundantPhraseRule,
      'The draft feels sufficient enough as of yet. Please ask the question again, but do not repeat again in the API guide. Marketing promised a free gift and a very unique launch. The end result should not merge together with notes in close proximity. Advance planning and a final conclusion still remains in the notes. Please return back and combine together your personal opinion with the added bonus and true facts from the review.',
    )

    expect(matches).toHaveLength(17)
    expect(matches[0]).toMatchObject({
      replacements: [{ value: 'enough' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'yet' }],
    })
    expect(matches[2]).toMatchObject({
      replacements: [{ value: 'ask' }],
    })
    expect(matches[3]).toMatchObject({
      replacements: [{ value: 'repeat' }],
    })
    expect(matches[4]).toMatchObject({
      message: 'The phrase "free gift" is often redundant.',
      replacements: [],
    })
    expect(matches[5]).toMatchObject({
      message: 'The phrase "very unique" is often redundant.',
      replacements: [],
    })
    expect(matches[6]).toMatchObject({
      replacements: [{ value: 'result' }],
    })
    expect(matches[7]).toMatchObject({
      replacements: [{ value: 'merge' }],
    })
    expect(matches[8]).toMatchObject({
      replacements: [{ value: 'proximity' }],
    })
    expect(matches[9]).toMatchObject({
      replacements: [{ value: 'Planning' }],
    })
    expect(matches[10]).toMatchObject({
      replacements: [{ value: 'conclusion' }],
    })
    expect(matches[11]).toMatchObject({
      replacements: [{ value: 'remains' }],
    })
    expect(matches[12]).toMatchObject({
      replacements: [{ value: 'return' }],
    })
    expect(matches[13]).toMatchObject({
      replacements: [{ value: 'combine' }],
    })
    expect(matches[14]).toMatchObject({
      replacements: [{ value: 'opinion' }],
    })
    expect(matches[15]).toMatchObject({
      replacements: [{ value: 'bonus' }],
    })
    expect(matches[16]).toMatchObject({
      replacements: [{ value: 'facts' }],
    })
  })

  it('does not flag quoted redundancy examples', () => {
    expect(
      runRule(
        redundantPhraseRule,
        'The style guide mentions "free gift" and "very unique" as examples, but the docs prose stays neutral.',
      ),
    ).toEqual([])
  })
})

describe('wordyPhraseRule', () => {
  it('flags curated wordy phrases with high-confidence replacements', () => {
    const matches = runRule(
      wordyPhraseRule,
      'We met in order to discuss the plan. At this point in time, we should leave. Due to the fact that it rained, we stayed inside.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      message: 'Use "to" instead of "in order to" here.',
      replacements: [{ value: 'to' }],
    })
  })

  it('covers plain-English rewrites used in docs and legal-ish prose', () => {
    const matches = runRule(
      wordyPhraseRule,
      'The tenant may cancel in the event that the service is unavailable. We rewrote the setup flow for the purpose of faster onboarding, and at this point in time the docs are stable. Teams should make use of the checklist prior to launch when each editor has the ability to review. For the reason that the API changed, we now review docs on a daily basis and keep the migration open for the duration of the rollout. In spite of the fact that the incident passed, the fix will remain in the near future until such time as the audit ends, with the exception of the sandbox environment.',
    )

    expect(matches).toHaveLength(13)
    expect(matches[0].replacements).toEqual([{ value: 'if' }])
    expect(matches[1].replacements).toEqual([{ value: 'to' }])
    expect(matches[2].replacements).toEqual([{ value: 'now' }])
    expect(matches[3].replacements).toEqual([{ value: 'use' }])
    expect(matches[4].replacements).toEqual([{ value: 'before' }])
    expect(matches[5].replacements).toEqual([{ value: 'can' }])
    expect(matches[6].replacements).toEqual([{ value: 'Because' }])
    expect(matches[7].replacements).toEqual([{ value: 'daily' }])
    expect(matches[8].replacements).toEqual([{ value: 'during' }])
    expect(matches[9].replacements).toEqual([{ value: 'Although' }])
    expect(matches[10].replacements).toEqual([{ value: 'soon' }])
    expect(matches[11].replacements).toEqual([{ value: 'until' }])
    expect(matches[12].replacements).toEqual([{ value: 'except for' }])
  })

  it('does not flag literal mentions of rewrite phrases in guidance text', () => {
    expect(
      runRule(
        wordyPhraseRule,
        'The copy guide mentions the phrase in order to as an editing smell, but the UI text here stays direct.',
      ),
    ).toEqual([])
  })
})

describe('wordyPhraseSuggestionRule', () => {
  it('flags softer plain-English suggestions without forcing a replacement', () => {
    const matches = runRule(
      wordyPhraseSuggestionRule,
      'Please reply at your earliest convenience. In terms of navigation, the Settings label is clearer now. For your information, the rollout begins at this time. Going forward, please do not hesitate to contact the team with respect to billing or in connection with support.',
    )

    expect(matches).toHaveLength(8)
    expect(matches[0]).toMatchObject({
      message:
        'This phrase sounds formal and indirect. Consider a plainer rewrite if the tone allows it.',
      replacements: [{ value: 'soon' }, { value: 'when you can' }],
    })
    expect(matches[1]).toMatchObject({
      message:
        'This phrase can often be rewritten more directly. Consider a plainer alternative that fits the sentence.',
      replacements: [{ value: 'For' }, { value: 'About' }],
    })
    expect(matches[2]?.replacements).toEqual([
      { value: 'For reference' },
      { value: 'Note that' },
    ])
    expect(matches[3]?.replacements).toEqual([
      { value: 'now' },
      { value: 'currently' },
    ])
    expect(matches[4]?.replacements).toEqual([
      { value: 'From now on' },
      { value: 'In future' },
    ])
    expect(matches[5]?.replacements).toEqual([
      { value: 'please' },
      { value: 'feel free to' },
    ])
    expect(matches[6]?.replacements).toEqual([
      { value: 'for' },
      { value: 'about' },
    ])
    expect(matches[7]?.replacements).toEqual([
      { value: 'for' },
      { value: 'about' },
    ])
  })

  it('offers multiple suggestions for stiff notice-style phrasing', () => {
    const matches = runRule(
      wordyPhraseSuggestionRule,
      'Please be advised that the rollout window moved.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      replacements: [{ value: 'Please note' }, { value: 'Note that' }],
    })
  })

  it('stays quiet for quoted examples in docs and UI guidance', () => {
    expect(
      runRule(
        wordyPhraseSuggestionRule,
        'The UI copy guide quotes "at your earliest convenience" as an example, explains when "in terms of" sounds too formal, and says please do not hesitate to is old-fashioned wording.',
      ),
    ).toEqual([])
  })
})

describe('houseStyleWordingRule', () => {
  it('flags deictic CTA wording in running product copy', () => {
    const matches = runRule(
      houseStyleWordingRule,
      'To download the report, click here. Mobile users can tap here to continue. Learn more here before launch, or read more here in the docs. If the article moves, click this link or tap this link from the help panel.',
    )

    expect(matches).toHaveLength(6)
    expect(matches[0]).toMatchObject({
      message:
        'Avoid "click here" wording in product copy. Name the link or destination instead.',
    })
    expect(matches[1]).toMatchObject({
      message:
        'Avoid "tap here" wording in product copy. Name the control or destination instead.',
    })
    expect(matches[2]).toMatchObject({
      message:
        'Avoid deictic CTA wording like "learn more here". Name the topic or destination instead.',
    })
    expect(matches[3]).toMatchObject({
      message:
        'Avoid deictic CTA wording like "read more here". Name the topic or destination instead.',
    })
    expect(matches[4]).toMatchObject({
      message:
        'Avoid "click this link" wording in product copy. Name the link destination instead.',
    })
    expect(matches[5]).toMatchObject({
      message:
        'Avoid "tap this link" wording in product copy. Name the destination instead.',
    })
  })

  it('does not flag guidance prose that refers to the wording literally', () => {
    expect(
      runRule(
        houseStyleWordingRule,
        'The style guide says to avoid "click here" and "tap here" in button copy. The CTA guide also says click this link is vague wording, and the tooltip copy labels learn more here as a weak default.',
      ),
    ).toEqual([])
  })
})

describe('long length rules', () => {
  it('flags very long sentences', () => {
    const matches = runRule(
      longSentenceRule,
      'This sentence keeps layering clause after clause until the reader has to hold too many ideas in working memory before the point becomes clear and actionable because every new phrase stretches the line a little further than it should for documentation.',
    )

    expect(matches).toHaveLength(1)
  })

  it('flags very long paragraphs', () => {
    const matches = runRule(
      longParagraphRule,
      'This paragraph keeps expanding with sentence after sentence until it becomes a dense wall of text that makes the structure of the explanation harder to scan, especially in documentation where readers are often trying to extract one concrete action quickly, and it keeps going long enough that splitting the thought would make the guidance easier to follow for someone reading under time pressure while debugging an issue in production.',
    )

    expect(matches).toHaveLength(1)
  })
})

describe('passiveVoiceRule', () => {
  it('flags likely passive constructions', () => {
    const matches = runRule(
      passiveVoiceRule,
      'The release was shipped yesterday. The report was approved by the team.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message:
        'This looks like passive voice. Consider naming the actor directly if clarity matters.',
    })
  })

  it('does not flag adjectival participles', () => {
    expect(
      runRule(
        passiveVoiceRule,
        'The team is ready and the docs are focused on quick setup.',
      ),
    ).toEqual([])
  })

  it('still finds passive voice after an introductory clause boundary', () => {
    const matches = runRule(
      passiveVoiceRule,
      'After review, the release was shipped yesterday.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message:
        'This looks like passive voice. Consider naming the actor directly if clarity matters.',
    })
  })
})

describe('sentenceStartNumberRule', () => {
  it('flags small digits at the start of running sentences', () => {
    const matches = runRule(
      sentenceStartNumberRule,
      '3 steps remain before launch. The report lists 3 remaining tasks.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Spell out "3" at the start of this sentence.',
      replacements: [{ value: 'Three' }],
    })
  })

  it('stays quiet for headings and short list-style fragments', () => {
    expect(
      runRule(sentenceStartNumberRule, '3 quick wins', {
        blockRanges: [
          {
            index: 0,
            start: 0,
            end: '3 quick wins'.length,
            text: '3 quick wins',
            tagName: 'h2',
            kind: 'heading',
          },
        ],
      }),
    ).toEqual([])
  })
})

describe('sentenceInitialReadabilityRule', () => {
  it('flags sentence-start hopefully in running prose', () => {
    const matches = runRule(
      sentenceInitialReadabilityRule,
      'Hopefully, the new onboarding flow lands today.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message:
        'Sentence-start "hopefully" can feel vague. Consider naming who hopes or rewriting the sentence.',
    })
  })

  it('ignores short heading-style fragments', () => {
    expect(
      runRule(sentenceInitialReadabilityRule, 'Hopefully better onboarding', {
        blockRanges: [
          {
            index: 0,
            start: 0,
            end: 'Hopefully better onboarding'.length,
            text: 'Hopefully better onboarding',
            tagName: 'li',
            kind: 'list-item',
          },
        ],
      }),
    ).toEqual([])
  })
})

describe('sentenceFinalReadabilityRule', () => {
  it('flags sentence-final also in neutral prose', () => {
    const matches = runRule(
      sentenceFinalReadabilityRule,
      'We updated the onboarding guide also.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Move "also" earlier in the sentence for a smoother read.',
    })
  })
})

describe('ableToBeRule', () => {
  it('flags awkward able-to-be passive phrasing', () => {
    const matches = runRule(
      ableToBeRule,
      'The feature is able to be configured by admins.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message:
        'This "able to be" phrasing is hard to scan. Rewrite it with a more direct active verb if possible.',
    })
  })
})

describe('overusedWordRule', () => {
  it('flags content words that dominate the document', () => {
    const matches = runRule(
      overusedWordRule,
      'This process improves the process because the process keeps the process stable.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message:
        'The word "process" appears 4 times. Consider trimming repetition or varying the wording.',
    })
  })
})

describe('nounStackRule', () => {
  it('flags a nominalization-heavy three-token pileup in documentation prose', () => {
    const matches = runRule(
      nominalizationPileupRule,
      'Review the documentation management notes before launch.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message:
        'This nominalization-heavy phrase may be hard to scan. Consider rewriting it with a verb or preposition.',
    })
  })

  it('flags a dense technical cluster separately from shorter noun pileups', () => {
    const matches = runRule(
      technicalNounClusterRule,
      'Open the deployment configuration validation settings for triage.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message:
        'This dense technical noun cluster is hard to parse. Consider adding a preposition, hyphen, or shorter rewrite.',
    })
  })

  it('stays quiet for established technical compounds and named forms', () => {
    expect(
      runRule(
        technicalNounClusterRule,
        'Update the API response body in the open source project and ask the customer support team to review the user interface copy.',
      ),
    ).toEqual([])
  })

  it('does not mistake adjective plus noun phrases for noun stacks', () => {
    expect(
      runRule(
        nominalizationPileupRule,
        'A helpful onboarding guide and a clear setup path keep the docs readable.',
      ),
    ).toEqual([])
  })

  it('stays quiet for verb plus well adverb phrases', () => {
    expect(
      runRule(nounStackRule, 'The service works well in production.'),
    ).toEqual([])
    expect(
      runRule(nounStackRule, 'The web app performs well under load.'),
    ).toEqual([])
    expect(runRule(nounStackRule, 'The guide reads well on mobile.')).toEqual(
      [],
    )
    expect(
      runRule(nounStackRule, 'The system scales well with traffic.'),
    ).toEqual([])
  })

  it('stays quiet for the known web app performs well involves regression shape', () => {
    expect(
      runRule(
        nounStackRule,
        'The web app performs well involves complex state handling.',
      ),
    ).toEqual([])
    expect(
      runRule(
        nounStackRule,
        'The web app performs well and involves complex state transitions.',
      ),
    ).toEqual([])
  })

  it('does not flag technical clusters when the evidence is only weak fallback noun guesses', () => {
    expect(
      runRule(
        technicalNounClusterRule,
        'The custom plugin frobnicator quazel setting failed in staging.',
      ),
    ).toEqual([])
  })
})

describe('wordinessRules', () => {
  it('exports the grouped wordiness rules', () => {
    expect(wordinessRules).toEqual([
      redundantPhraseRule,
      wordyPhraseRule,
      wordyPhraseSuggestionRule,
      houseStyleWordingRule,
      longSentenceRule,
      longParagraphRule,
      sentenceStartNumberRule,
      sentenceInitialReadabilityRule,
      sentenceFinalReadabilityRule,
      ableToBeRule,
      nominalizationPileupRule,
      technicalNounClusterRule,
      overusedWordRule,
    ])
  })
})
