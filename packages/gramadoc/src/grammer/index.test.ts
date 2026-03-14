import { describe, expect, it } from 'vitest'
import { grammerRules } from './index'
import { identifiersRules } from './rules/data-validation-structured-text/identifiers/rule'
import { urlsEmailsRules } from './rules/data-validation-structured-text/urls-emails/rule'
import { currencyUnitsRules } from './rules/formatting-typography/currency-units/rule'
import { datesTimesRules } from './rules/formatting-typography/dates-times/rule'
import { listsLayoutRules } from './rules/formatting-typography/lists-layout/rule'
import { numbersRules } from './rules/formatting-typography/numbers/rule'
import { spacingRules } from './rules/formatting-typography/spacing/rule'
import { unitConversionsRules } from './rules/formatting-typography/unit-conversions/rule'
import { agreementErrorsRules } from './rules/grammar/agreement-errors/rule'
import { articlesDeterminersRules } from './rules/grammar/articles-determiners/rule'
import { conjunctionsRules } from './rules/grammar/conjunctions/rule'
import { prepositionsRules } from './rules/grammar/prepositions/rule'
import { pronounsRules } from './rules/grammar/pronouns/rule'
import { verbUsageRules } from './rules/grammar/verb-usage/rule'
import { foreignTermsRules } from './rules/internationalization/foreign-terms/rule'
import { l2FalseFriendsRules } from './rules/internationalization/l2-false-friends/rule'
import { languageVariantsRules } from './rules/internationalization/language-variants/rule'
import { apostrophesRules } from './rules/punctuation/apostrophes/rule'
import { commasRules } from './rules/punctuation/commas/rule'
import { otherPunctuationRules } from './rules/punctuation/other-punctuation/rule'
import { periodsSentenceBoundariesRules } from './rules/punctuation/periods-sentence-boundaries/rule'
import { quotationMarksRules } from './rules/punctuation/quotation-marks/rule'
import { wordConfusionRules } from './rules/semantics-clarity/word-confusion/rule'
import { negationRules } from './rules/sentence-structure-syntax/negation/rule'
import { basicSpellingRules } from './rules/spelling-orthography/basic-spelling/rule'
import { capitalizationRules } from './rules/spelling-orthography/capitalization/rule'
import { compoundWordsRules } from './rules/spelling-orthography/compound-words/rule'
import { namesAcronymsSpecializedTermsRules } from './rules/spelling-orthography/names-acronyms-specialized-terms/rule'
import { concisenessRules } from './rules/style-readability/conciseness/rule'
import { ePrimeRules } from './rules/style-readability/e-prime/rule'
import { houseStyleRules } from './rules/style-readability/house-style/rule'
import { informalityToneRules } from './rules/style-readability/informality-tone/rule'
import { repetitionRules } from './rules/style-readability/repetition/rule'
import { wordChoiceRules } from './rules/style-readability/word-choice/rule'
import { wordinessRules } from './rules/style-readability/wordiness/rule'
import { buildRuleCheckContext } from './utils'

type ErrorFragment = {
  text: string
  expectedRuleIds: string[]
}

function analyzeText(
  text: string,
  options?: Parameters<typeof buildRuleCheckContext>[1],
) {
  const context = buildRuleCheckContext(text, options)

  return grammerRules.flatMap((rule) => rule.check(context))
}

function getMatchedRuleIds(
  text: string,
  options?: Parameters<typeof buildRuleCheckContext>[1],
) {
  return new Set(analyzeText(text, options).map((match) => match.rule.id))
}

function expectRulesToMatch(
  text: string,
  expectedRuleIds: string[],
  minimumMatches = expectedRuleIds.length,
) {
  const matches = analyzeText(text)
  const matchedRuleIds = getMatchedRuleIds(text)

  expect(matches.length).toBeGreaterThanOrEqual(minimumMatches)

  for (const ruleId of expectedRuleIds) {
    expect(matchedRuleIds.has(ruleId)).toBe(true)
  }
}

const goodCases = [
  'However, we changed course after lunch.',
  'For example, this sentence needs a comma.',
  'I went home, and I cooked dinner.',
  'She bought a book yesterday.',
  'We found an orange on the table.',
  'Many books were helpful.',
  'Much water remained.',
  'Fewer books were missing.',
  'Less money was available.',
  'These books were helpful.',
  'That guide is clear.',
  'Several reasons support the plan.',
  'There is one problem here.',
  'They are ready.',
  'She has notes.',
  'We arrived at the station.',
  'I depend on my notes.',
  'She is interested in design.',
  'The notes are for her and me.',
  'He is responsible for the launch.',
  'She has gone home already.',
  'We met in London on Monday in January.',
  'We studied The Great Gatsby before class.',
  'Remember this: Start with a capital.',
  'This sentence is very quiet.',
  'The example looked ordinary.',
  'We used GitHub, YouTube, OpenAI, and an iPhone.',
  'Meeting Notes.',
  'This sentence ends with a period.',
  'We finished. Then we left.',
  'This is exciting!',
  'Wait...',
  'Visit https://www.example.com/docs for the guide.',
  'Contact support@example.com today.',
  'Open https://example.com/docs. Then try http://example.org.',
  'The report was very clear.',
  'This is the test.',
  'The writer sent a simple note.',
  "You're welcome.",
  'Their team is ready.',
  'We have too many notes.',
  'The writer emailed the guest after lunch.',
  "I don't think you're ready because it's late.",
  'Please send an email to your coworker through the website.',
  'The website linked to the database in a notebook.',
  'She is a well-known author in a part-time role with an up-to-date guide.',
  'The decision-making process produced a high-quality report.',
  'This sentence has two spaces removed.',
  'This is the 21st draft, and the discount is 50%.',
  'Submit ABC-123 before 03/09/2026.',
  'The refund was USD 20 and the package weighed 10 kg.',
  '- First item.\n- Second item.',
  'We had a lot of time.',
  'Maybe we should leave now.',
  'We met to discuss the plan.',
  'Bring apples, oranges; bananas and three options: Plan ahead.',
  'The company changed the policy.',
  'The application programming interface (API) returned data.',
  'The palette helped us arrange the display.',
  'Please review the draft because we are going to finish today.',
  'Wait -- really? Bring apples; oranges and bananas.',
  'Sarah and I went home early.',
  'We adopted a careful process.',
  'The delay had an effect on the launch.',
  'We cannot stay late tonight.',
] as const

const errorFragments = {
  introHowever: {
    text: 'However we changed course.',
    expectedRuleIds: ['MISSING_COMMA_AFTER_INTRODUCTORY_PHRASE'],
  },
  commaSplice: {
    text: 'I went home, I cooked dinner.',
    expectedRuleIds: ['COMMA_SPLICE'],
  },
  missingArticleBook: {
    text: 'She bought book yesterday.',
    expectedRuleIds: ['MISSING_ARTICLES'],
  },
  articleApple: {
    text: 'I ate a apple before lunch.',
    expectedRuleIds: ['ARTICLE_BEFORE_VOWEL'],
  },
  articleBanana: {
    text: 'She packed an banana for the trip.',
    expectedRuleIds: ['ARTICLE_BEFORE_CONSONANT'],
  },
  determinerMuchBooks: {
    text: 'Much books were helpful.',
    expectedRuleIds: ['INCORRECT_DETERMINERS'],
  },
  determinerFewerMoney: {
    text: 'Fewer money was available.',
    expectedRuleIds: ['INCORRECT_DETERMINERS'],
  },
  demonstrativeThisBooks: {
    text: 'This books were helpful.',
    expectedRuleIds: ['DEMONSTRATIVE_MISUSE'],
  },
  thereIsMany: {
    text: 'There is many reasons to wait.',
    expectedRuleIds: ['THERE_IS_ARE_AGREEMENT'],
  },
  lowerSentence: {
    text: 'this sentence starts lowercase.',
    expectedRuleIds: ['SENTENCE_CAPITALIZATION'],
  },
  subjectTheyIs: {
    text: 'They is ready.',
    expectedRuleIds: ['SUBJECT_VERB_AGREEMENT'],
  },
  subjectSheHave: {
    text: 'She have notes.',
    expectedRuleIds: ['SUBJECT_VERB_AGREEMENT'],
  },
  prepArrivedTo: {
    text: 'We arrived to the station.',
    expectedRuleIds: ['INCORRECT_PREPOSITIONS'],
  },
  prepDependOf: {
    text: 'I depend of my notes.',
    expectedRuleIds: ['INCORRECT_PREPOSITIONS'],
  },
  prepInterestedOn: {
    text: 'She is interested on design.',
    expectedRuleIds: ['INCORRECT_PREPOSITIONS'],
  },
  prepMarriedWith: {
    text: 'They are married with each other.',
    expectedRuleIds: ['INCORRECT_PREPOSITIONS'],
  },
  pronounForShe: {
    text: 'The notes are for she.',
    expectedRuleIds: ['OBJECT_PRONOUN_AFTER_PREPOSITION'],
  },
  pronounBetweenYouAndI: {
    text: 'The decision is between you and I.',
    expectedRuleIds: ['OBJECT_PRONOUN_AFTER_PREPOSITION'],
  },
  pronounSubjectMe: {
    text: 'Me went home early.',
    expectedRuleIds: ['SUBJECT_PRONOUN_AT_SENTENCE_START'],
  },
  pronounReflexiveSubject: {
    text: 'Sarah and myself went home early.',
    expectedRuleIds: ['REFLEXIVE_PRONOUN_AS_SUBJECT'],
  },
  duplicateMeridiem: {
    text: 'Meet at 10 a.m. pm tomorrow.',
    expectedRuleIds: ['DUPLICATE_MERIDIEM'],
  },
  repeatedTimeSeparator: {
    text: 'The call starts at 10::30.',
    expectedRuleIds: ['REPEATED_TIME_SEPARATOR'],
  },
  repeatedDateSeparator: {
    text: 'The deadline is 03//09//2026.',
    expectedRuleIds: ['REPEATED_DATE_SEPARATOR'],
  },
  malformedUuid: {
    text: 'Use 123e4567-e89b-12d3-a456-42661417400 in the example.',
    expectedRuleIds: ['MALFORMED_UUID'],
  },
  repeatedIdentifierSeparator: {
    text: 'Use ABC--123 in the example.',
    expectedRuleIds: ['REPEATED_IDENTIFIER_SEPARATOR'],
  },
  splitIdentifierNumber: {
    text: 'Use TASK_ 45 in the example.',
    expectedRuleIds: ['SPLIT_IDENTIFIER_NUMBER'],
  },
  repeatedHedge: {
    text: 'Maybe perhaps we should leave now.',
    expectedRuleIds: ['REPEATED_HEDGE'],
  },
  fillerLeadIn: {
    text: 'It is important to note that the report is late.',
    expectedRuleIds: ['FILLER_LEAD_IN'],
  },
  currencyCodeSpacing: {
    text: 'The refund was USD20.',
    expectedRuleIds: ['CURRENCY_CODE_SPACING'],
  },
  repeatedUnitSymbol: {
    text: 'The package weighed 10 kg kg.',
    expectedRuleIds: ['REPEATED_UNIT_SYMBOL'],
  },
  numberUnitSpacing: {
    text: 'The package weighed 10kg.',
    expectedRuleIds: ['NUMBER_UNIT_SPACING'],
  },
  mixedBulletMarker: {
    text: '- First item\n* Second item',
    expectedRuleIds: ['MIXED_BULLET_MARKER'],
  },
  inconsistentNumberedList: {
    text: '1. First item\n3. Second item',
    expectedRuleIds: ['INCONSISTENT_NUMBERED_LIST'],
  },
  missingSpaceAfterListMarker: {
    text: '-Item one\n1.Item two',
    expectedRuleIds: ['MISSING_SPACE_AFTER_LIST_MARKER'],
  },
  repeatedSemicolon: {
    text: 'Bring apples;; oranges and bananas.',
    expectedRuleIds: ['REPEATED_SEMICOLON'],
  },
  repeatedColon: {
    text: 'Remember this:: bring ID and notes.',
    expectedRuleIds: ['REPEATED_COLON'],
  },
  repeatedDashSeparator: {
    text: 'Wait---really?',
    expectedRuleIds: ['REPEATED_DASH_SEPARATOR'],
  },
  foreignTermSpelling: {
    text: 'We adopted an adhoc process with a bonafide exception.',
    expectedRuleIds: ['FOREIGN_TERM_SPELLING'],
  },
  phraseWordChoice: {
    text: 'I could care less about that.',
    expectedRuleIds: ['PHRASE_WORD_CHOICE'],
  },
  singleWordChoice: {
    text: 'Irregardless, we had alot of time.',
    expectedRuleIds: ['SINGLE_WORD_CHOICE'],
  },
  mixedLanguageVariants: {
    text: 'The color palette helped us organise the centre display.',
    expectedRuleIds: ['MIXED_LANGUAGE_VARIANTS'],
  },
  chatShorthand: {
    text: 'pls review the draft, btw idk if the client said thx.',
    expectedRuleIds: ['CHAT_SHORTHAND'],
  },
  informalContraction: {
    text: 'We are gonna finish this, and they kinda know it.',
    expectedRuleIds: ['INFORMAL_CONTRACTION'],
  },
  haveAnAffectOn: {
    text: 'The delay had an affect on the launch.',
    expectedRuleIds: ['HAVE_AN_AFFECT_ON'],
  },
  takeAffect: {
    text: 'The policy will take affect tomorrow.',
    expectedRuleIds: ['TAKE_AFFECT'],
  },
  modalOf: {
    text: 'They might of missed the train.',
    expectedRuleIds: ['MODAL_HAVE'],
  },
  doubleNegative: {
    text: "We don't need no backup plan.",
    expectedRuleIds: ['DOUBLE_NEGATIVE'],
  },
  misplacedNot: {
    text: 'We not can stay late.',
    expectedRuleIds: ['MISPLACED_NOT'],
  },
  pastParticipleWent: {
    text: 'She has went home already.',
    expectedRuleIds: ['IRREGULAR_PAST_PARTICIPLE'],
  },
  doSupportWrites: {
    text: 'Does he writes every morning?',
    expectedRuleIds: ['DO_SUPPORT_BASE_VERB'],
  },
  infinitiveWalked: {
    text: 'Sometimes I like to walked to the shops.',
    expectedRuleIds: ['INFINITIVE_BASE_VERB'],
  },
  lowerLondon: {
    text: 'We met in london yesterday.',
    expectedRuleIds: ['PROPER_NOUN_CAPITALIZATION'],
  },
  lowerGreatGatsby: {
    text: 'We studied the great gatsby before class.',
    expectedRuleIds: ['TITLE_CAPITALIZATION'],
  },
  colonLower: {
    text: 'Remember this: start with a capital.',
    expectedRuleIds: ['CAPITALIZATION_AFTER_PUNCTUATION'],
  },
  allCapsVery: {
    text: 'This sentence is VERY loud.',
    expectedRuleIds: ['INCORRECT_ALL_CAPS_USAGE'],
  },
  mixedExample: {
    text: 'The eXaMpLe looked odd.',
    expectedRuleIds: ['MIXED_CASING_ERRORS'],
  },
  brandGithub: {
    text: 'We used github yesterday.',
    expectedRuleIds: ['BRAND_CAPITALIZATION'],
  },
  headingNotes: {
    text: 'meeting notes',
    expectedRuleIds: ['CAPITALIZATION_IN_HEADINGS'],
  },
  missingEndingPunctuation: {
    text: 'This sentence is missing ending punctuation',
    expectedRuleIds: ['SENTENCE_ENDING_PUNCTUATION'],
  },
  missingSentenceSpace: {
    text: 'We finished.Then we left.',
    expectedRuleIds: ['MISSING_SPACE_AFTER_SENTENCE_BOUNDARY'],
  },
  repeatedPunctuation: {
    text: 'This is exciting!!',
    expectedRuleIds: ['REPEATED_TERMINAL_PUNCTUATION'],
  },
  repeatedWord: {
    text: 'The the launch plan changed.',
    expectedRuleIds: ['REPEATED_WORD'],
  },
  missingUrlProtocol: {
    text: 'Visit www.example.com/docs today.',
    expectedRuleIds: ['MISSING_URL_PROTOCOL'],
  },
  malformedUrlProtocol: {
    text: 'Open https:/example.com today.',
    expectedRuleIds: ['MALFORMED_URL_PROTOCOL'],
  },
  invalidEmail: {
    text: 'Contact support@@example.com today.',
    expectedRuleIds: ['INVALID_EMAIL_FORMAT'],
  },
  typoClebr: {
    text: 'The report was very clebr.',
    expectedRuleIds: ['TYPOGRAPHICAL_ERRORS'],
  },
  transposedTeh: {
    text: 'This is teh test.',
    expectedRuleIds: ['TRANSPOSED_LETTERS'],
  },
  missingLetterSimpl: {
    text: 'The writer sent a simpl note.',
    expectedRuleIds: ['MISSING_LETTERS'],
  },
  homophoneYour: {
    text: 'Your welcome.',
    expectedRuleIds: ['YOUR_YOURE'],
  },
  missingDiacritics: {
    text: 'The jalapeno made the naive writer email the fiance.',
    expectedRuleIds: ['INCORRECT_DIACRITICS'],
  },
  incorrectApostrophes: {
    text: 'I dont think youre ready because its late.',
    expectedRuleIds: ['INCORRECT_APOSTROPHES'],
  },
  closedCompoundWebSite: {
    text: 'The web site linked to the data base.',
    expectedRuleIds: ['CLOSED_VS_OPEN_COMPOUNDS'],
  },
  unnecessaryHyphenEmail: {
    text: 'Please send an e-mail today.',
    expectedRuleIds: ['UNNECESSARY_HYPHEN'],
  },
  missingHyphenWellKnown: {
    text: 'She is a well known author.',
    expectedRuleIds: ['MISSING_HYPHEN'],
  },
  hyphenatedDecisionMaking: {
    text: 'The decision making process is slow.',
    expectedRuleIds: ['HYPHENATED_COMPOUND_ERRORS'],
  },
  redundantPhrase: {
    text: 'We reviewed the basic fundamentals.',
    expectedRuleIds: ['REDUNDANT_PHRASE'],
  },
  wordyPhrase: {
    text: 'We met in order to discuss the plan.',
    expectedRuleIds: ['WORDY_PHRASE'],
  },
  multipleSpaces: {
    text: 'This sentence has  two spaces.',
    expectedRuleIds: ['MULTIPLE_SPACES'],
  },
  ordinalSuffix: {
    text: 'This is the 21th draft.',
    expectedRuleIds: ['ORDINAL_SUFFIX'],
  },
  duplicateCurrency: {
    text: 'The refund was $$20.',
    expectedRuleIds: ['DUPLICATE_CURRENCY_SYMBOL'],
  },
  duplicatePercent: {
    text: 'The discount was 50%% today.',
    expectedRuleIds: ['DUPLICATE_PERCENT_SIGN'],
  },
  spaceBeforePunctuation: {
    text: 'Hello , world !',
    expectedRuleIds: ['SPACE_BEFORE_PUNCTUATION'],
  },
  missingSpaceAfterPunctuation: {
    text: 'Bring apples,oranges;bananas and three options:plan ahead.',
    expectedRuleIds: ['MISSING_SPACE_AFTER_PUNCTUATION'],
  },
  possessiveIts: {
    text: "The company changed it's policy.",
    expectedRuleIds: ['POSSESSIVE_ITS'],
  },
  pluralPossessive: {
    text: 'The writers room met in the teachers lounge.',
    expectedRuleIds: ['PLURAL_POSSESSIVE_APOSTROPHE'],
  },
  misspelledNames: {
    text: 'Jonh thanked Micheal and Saraa.',
    expectedRuleIds: ['MISSPELLED_NAMES'],
  },
  incorrectAcronyms: {
    text: 'The HTLM and JOSN files loaded.',
    expectedRuleIds: ['INCORRECT_ACRONYMS'],
  },
  acronymCapitalization: {
    text: 'The api returned Json via html.',
    expectedRuleIds: ['ACRONYM_CAPITALIZATION'],
  },
  undefinedAcronym: {
    text: 'The API returned data.',
    expectedRuleIds: ['UNDEFINED_ACRONYMS'],
  },
  abbreviationForms: {
    text: 'Bring fruit, e.g apples, i.e pears, in the apples vs oranges section.',
    expectedRuleIds: ['INCORRECT_ABBREVIATION_FORMS'],
  },
} satisfies Record<string, ErrorFragment>

type ErrorFragmentKey = keyof typeof errorFragments

const badCaseKeys: ErrorFragmentKey[] = [
  'introHowever',
  'commaSplice',
  'missingArticleBook',
  'articleApple',
  'articleBanana',
  'determinerMuchBooks',
  'determinerFewerMoney',
  'demonstrativeThisBooks',
  'thereIsMany',
  'lowerSentence',
  'subjectTheyIs',
  'prepArrivedTo',
  'pronounForShe',
  'pronounBetweenYouAndI',
  'pronounSubjectMe',
  'pronounReflexiveSubject',
  'duplicateMeridiem',
  'repeatedTimeSeparator',
  'repeatedDateSeparator',
  'malformedUuid',
  'repeatedIdentifierSeparator',
  'splitIdentifierNumber',
  'repeatedHedge',
  'fillerLeadIn',
  'currencyCodeSpacing',
  'repeatedUnitSymbol',
  'numberUnitSpacing',
  'mixedBulletMarker',
  'inconsistentNumberedList',
  'missingSpaceAfterListMarker',
  'repeatedSemicolon',
  'repeatedColon',
  'repeatedDashSeparator',
  'foreignTermSpelling',
  'phraseWordChoice',
  'singleWordChoice',
  'mixedLanguageVariants',
  'chatShorthand',
  'informalContraction',
  'haveAnAffectOn',
  'takeAffect',
  'prepMarriedWith',
  'modalOf',
  'doubleNegative',
  'misplacedNot',
  'pastParticipleWent',
  'doSupportWrites',
  'lowerLondon',
  'lowerGreatGatsby',
  'colonLower',
  'allCapsVery',
  'mixedExample',
  'brandGithub',
  'headingNotes',
  'missingEndingPunctuation',
  'missingSentenceSpace',
  'repeatedPunctuation',
  'repeatedWord',
  'missingUrlProtocol',
  'malformedUrlProtocol',
  'invalidEmail',
  'typoClebr',
  'transposedTeh',
  'missingLetterSimpl',
  'homophoneYour',
  'missingDiacritics',
  'incorrectApostrophes',
  'closedCompoundWebSite',
  'unnecessaryHyphenEmail',
  'missingHyphenWellKnown',
  'hyphenatedDecisionMaking',
  'redundantPhrase',
  'wordyPhrase',
  'multipleSpaces',
  'ordinalSuffix',
  'duplicateCurrency',
  'duplicatePercent',
  'spaceBeforePunctuation',
  'missingSpaceAfterPunctuation',
  'possessiveIts',
  'pluralPossessive',
  'misspelledNames',
  'incorrectAcronyms',
  'acronymCapitalization',
  'undefinedAcronym',
  'abbreviationForms',
]

const badCases = badCaseKeys.map((key, index) => ({
  name: `bad ${index + 1}`,
  text: errorFragments[key].text,
  expectedRuleIds: errorFragments[key].expectedRuleIds,
}))

const terribleCases = badCaseKeys.map((_, index) => {
  const keys = [
    badCaseKeys[index],
    badCaseKeys[(index + 17) % badCaseKeys.length],
    badCaseKeys[(index + 31) % badCaseKeys.length],
  ] as const

  return {
    name: `terrible ${index + 1}`,
    text: keys.map((key) => errorFragments[key].text).join('\n'),
    expectedRuleIds: [
      ...new Set(keys.flatMap((key) => errorFragments[key].expectedRuleIds)),
    ],
    minimumMatches: keys.length,
  }
})

describe('grammerRules end-to-end corpus', () => {
  it('includes every grouped rule export in the main analyzer', () => {
    const groupedRuleIds = [
      ...basicSpellingRules,
      ...repetitionRules,
      ...concisenessRules,
      ...wordChoiceRules,
      ...wordinessRules,
      ...spacingRules,
      ...numbersRules,
      ...currencyUnitsRules,
      ...unitConversionsRules,
      ...listsLayoutRules,
      ...datesTimesRules,
      ...identifiersRules,
      ...urlsEmailsRules,
      ...agreementErrorsRules,
      ...articlesDeterminersRules,
      ...conjunctionsRules,
      ...prepositionsRules,
      ...pronounsRules,
      ...verbUsageRules,
      ...negationRules,
      ...wordConfusionRules,
      ...foreignTermsRules,
      ...l2FalseFriendsRules,
      ...languageVariantsRules,
      ...capitalizationRules,
      ...namesAcronymsSpecializedTermsRules,
      ...compoundWordsRules,
      ...apostrophesRules,
      ...commasRules,
      ...otherPunctuationRules,
      ...periodsSentenceBoundariesRules,
      ...quotationMarksRules,
      ...informalityToneRules,
      ...ePrimeRules,
      ...houseStyleRules,
    ].map((rule) => rule.id)

    expect(grammerRules.map((rule) => rule.id).sort()).toEqual(
      groupedRuleIds.sort(),
    )
  })

  it('defines the expected corpus sizes', () => {
    expect(goodCases.length).toBeGreaterThanOrEqual(50)
    expect(badCases.length).toBeGreaterThanOrEqual(50)
    expect(terribleCases.length).toBeGreaterThanOrEqual(50)
  })

  it.each(
    goodCases.map((text, index) => ({ name: `good ${index + 1}`, text })),
  )('accepts $name', ({ text }) => {
    expect(analyzeText(text)).toEqual([])
  })

  it.each(badCases)('flags $name', ({ text, expectedRuleIds }) => {
    expectRulesToMatch(text, expectedRuleIds, 1)
  })

  it('keeps clause-introducing "that" quiet in full analyzer output', () => {
    const text =
      'Archaeologists around the world have recently uncovered several remarkable discoveries that are already reshaping how historians understand ancient civilizations. The findings, which were announced over the last few weeks, include artifacts, ruins and burial sites that researchers say could provide new clues about how early societies lived, traded and organized themselves.'

    const demonstrativeMatches = analyzeText(text).filter(
      (match) => match.rule.id === 'DEMONSTRATIVE_MISUSE',
    )

    expect(demonstrativeMatches).toEqual([])
  })

  it('keeps optional editorial packs disabled by default', () => {
    const matchedRuleIds = getMatchedRuleIds(
      'There are two issues in the draft, the summary is unclear, and the route covers 5 km.',
    )

    expect(matchedRuleIds.has('E_PRIME_STRICT')).toBe(false)
    expect(matchedRuleIds.has('E_PRIME_LOOSE')).toBe(false)
    expect(matchedRuleIds.has('UNIT_CONVERSION_SUGGESTION')).toBe(false)
  })

  it('surfaces unit conversion suggestions only when the editorial pack is enabled', () => {
    const matchedRuleIds = getMatchedRuleIds('The route covers 5 km.', {
      enabledRulePacks: ['editorial/unit-conversions'],
    })

    expect(matchedRuleIds.has('UNIT_CONVERSION_SUGGESTION')).toBe(true)
  })

  it('keeps L2 false-friend packs disabled unless the matching profile is enabled', () => {
    const text =
      'We assisted to the meeting and demanded them to update the summary.'

    expect(getMatchedRuleIds(text).has('L2_FALSE_FRIENDS')).toBe(false)
    expect(
      getMatchedRuleIds(text, {
        enabledRulePacks: ['l2-false-friends/fr'],
        nativeLanguageProfile: 'l1/fr',
      }).has('L2_FALSE_FRIENDS'),
    ).toBe(true)
  })

  it('adds E-Prime matches only when the optional packs are enabled', () => {
    const text =
      'There are two issues in the draft, and the summary is unclear.'
    const baselineMatches = analyzeText(text)
    const strictMatches = grammerRules.flatMap((rule) =>
      rule.check(
        buildRuleCheckContext(text, {
          enabledRulePacks: ['creative-writing/e-prime-strict'],
        }),
      ),
    )
    const looseMatches = grammerRules.flatMap((rule) =>
      rule.check(
        buildRuleCheckContext(text, {
          enabledRulePacks: ['creative-writing/e-prime-loose'],
        }),
      ),
    )

    expect(baselineMatches.map((match) => match.rule.id)).not.toContain(
      'E_PRIME_STRICT',
    )
    expect(baselineMatches.map((match) => match.rule.id)).not.toContain(
      'E_PRIME_LOOSE',
    )
    expect(strictMatches.map((match) => match.rule.id)).toContain(
      'E_PRIME_STRICT',
    )
    expect(looseMatches.map((match) => match.rule.id)).toContain(
      'E_PRIME_LOOSE',
    )
  })

  it.each(terribleCases)('flags $name with several rule families at once', ({
    text,
    expectedRuleIds,
    minimumMatches,
  }) => {
    expectRulesToMatch(text, expectedRuleIds, minimumMatches)
  })
})
