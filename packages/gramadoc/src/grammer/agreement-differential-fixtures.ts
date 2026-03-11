export interface AgreementLanguageToolFixture {
  family: string
  text: string
  expectedRuleIds: string[]
  forbiddenRuleIds?: string[]
  unsafeRewrite?: boolean
  languageTool: {
    observedOn: '2026-03-11'
    flagged: boolean
    ruleIds: string[]
  }
}

export const languageToolAgreementFalsePositiveFixtures: AgreementLanguageToolFixture[] =
  [
    {
      family: 'coordinated clauses stay quiet on the local singular predicate',
      text: "I can't stand it and every update makes it worse.",
      expectedRuleIds: [],
      forbiddenRuleIds: ['SUBJECT_VERB_AGREEMENT'],
      unsafeRewrite: true,
      languageTool: {
        observedOn: '2026-03-11',
        flagged: false,
        ruleIds: [],
      },
    },
    {
      family: 'singular series heads stay quiet',
      text: 'A series of updates is live.',
      expectedRuleIds: [],
      forbiddenRuleIds: ['SUBJECT_VERB_AGREEMENT'],
      unsafeRewrite: true,
      languageTool: {
        observedOn: '2026-03-11',
        flagged: false,
        ruleIds: [],
      },
    },
    {
      family: 'titled works with internal of-phrases stay quiet',
      text: 'The Chronicles of Narnia is on the shelf.',
      expectedRuleIds: [],
      forbiddenRuleIds: ['SUBJECT_VERB_AGREEMENT'],
      unsafeRewrite: true,
      languageTool: {
        observedOn: '2026-03-11',
        flagged: true,
        ruleIds: ['AGREEMENT_SENT_START'],
      },
    },
  ]

export const languageToolAgreementFalseNegativeFixtures: AgreementLanguageToolFixture[] =
  [
    {
      family: 'partitive each-of phrases still detect finite be mismatches',
      text: 'Each of the updates are ready.',
      expectedRuleIds: ['SUBJECT_VERB_AGREEMENT'],
      languageTool: {
        observedOn: '2026-03-11',
        flagged: true,
        ruleIds: ['AGREEMENT_SENT_START'],
      },
    },
    {
      family: 'partitive one-of phrases recover singular bare-verb coverage',
      text: 'One of the changes make sense.',
      expectedRuleIds: ['SUBJECT_VERB_AGREEMENT'],
      languageTool: {
        observedOn: '2026-03-11',
        flagged: false,
        ruleIds: [],
      },
    },
    {
      family: 'plural lexical heads still break regular s-form verbs',
      text: 'The patch notes explains the fix.',
      expectedRuleIds: ['SUBJECT_VERB_AGREEMENT'],
      languageTool: {
        observedOn: '2026-03-11',
        flagged: true,
        ruleIds: ['SUBJECT_VERB_AGREEMENT_PLURAL'],
      },
    },
    {
      family: 'coordinated nominal subjects still recover plural local agreement',
      text: 'The user and admin approves the change.',
      expectedRuleIds: ['SUBJECT_VERB_AGREEMENT'],
      languageTool: {
        observedOn: '2026-03-11',
        flagged: false,
        ruleIds: [],
      },
    },
  ]
