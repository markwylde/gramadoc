import type { Match } from '../../../../types.js'
import { hasPosHint } from '../../../linguistics.js'
import {
  getBaseVerbCandidate,
  getBaseVerbCandidateInAuxiliaryContext,
  getBaseVerbCandidateInInfinitiveContext,
  getPastParticipleCandidateInPerfectContext,
  getPastTenseCandidate,
  toPresentParticiple,
} from '../../../morphology.js'
import { analyzeQuotationMarks } from '../../../quotation.js'
import type {
  GrammerOptionalRulePack,
  GrammerRule,
  Token,
} from '../../../types.js'
import { createMatch, preserveCase } from '../../../utils.js'

const MODAL_OF_WORDS = new Set(['could', 'might', 'must', 'should', 'would'])
const INFINITIVE_TRIGGER_WORDS = new Set([
  'attempt',
  'attempts',
  'attempted',
  'begin',
  'began',
  'continue',
  'continued',
  'decide',
  'decided',
  'forget',
  'forgot',
  'forgotten',
  'hope',
  'hoped',
  'like',
  'liked',
  'liked',
  'likes',
  'love',
  'loved',
  'need',
  'needed',
  'plan',
  'planned',
  'prefer',
  'preferred',
  'remember',
  'remembered',
  'start',
  'started',
  'try',
  'tried',
  'want',
  'wanted',
])
const DO_SUPPORT_INTERVENING_WORDS = new Set([
  'he',
  'she',
  'they',
  'we',
  'i',
  'you',
  'it',
  'someone',
  'somebody',
  'anyone',
  'everybody',
  'everyone',
  'who',
])
const DO_SUPPORT_WORDS = new Set([
  'did',
  "didn't",
  'do',
  "don't",
  'does',
  "doesn't",
])
const MODAL_BASE_VERB_WORDS = new Set([
  'can',
  'could',
  'may',
  'might',
  'must',
  'should',
  'will',
  'would',
])
const QUESTION_LEAD_WORDS = new Set(['why'])
const INTERVENING_ADVERB_WORDS = new Set([
  'already',
  'always',
  'ever',
  'just',
  'never',
  'often',
  'soon',
  'still',
])
const QUESTION_VERB_FOLLOWERS = new Set([
  'a',
  'an',
  'away',
  'back',
  'down',
  'her',
  'him',
  'home',
  'in',
  'into',
  'it',
  'me',
  'our',
  'out',
  'over',
  'the',
  'their',
  'them',
  'these',
  'this',
  'those',
  'through',
  'to',
  'up',
  'us',
  'you',
  'your',
])
const NEEDS_ELLIPSIS_TRIGGERS = new Set(['need', 'needs', 'needed'])
const NEEDS_ELLIPSIS_BASE_VERBS = new Set([
  'change',
  'check',
  'clean',
  'fix',
  'move',
  'replace',
  'update',
])
const REGIONAL_MODAL_WORDS = new Set(['could', 'might', 'should', 'would'])
const CREATIVE_WRITING_RULE_PACK_PREFIX =
  'creative-writing/' satisfies `${string}/`
const SUBJECT_DROP_LEAD_VERBS = new Set(['appears', 'seems'])
const SUBJECT_DROP_COMPLEMENTS = new Set(['like', 'that'])
const SUBJECT_DROP_SUPPRESSED_BLOCK_KINDS = new Set([
  'blockquote',
  'heading',
  'list-item',
])

function isWhitespaceOnly(text: string, start: number, end: number) {
  return /^\s+$/.test(text.slice(start, end))
}

function isSentenceLeadToken(text: string, offset: number) {
  let cursor = offset - 1

  while (cursor >= 0 && /\s/.test(text[cursor] ?? '')) {
    cursor -= 1
  }

  return cursor < 0 || '.!?\n'.includes(text[cursor] ?? '')
}

function getNextTokenInSentence(
  tokens: Token[],
  index: number,
  sentenceIndex: number,
) {
  const token = tokens[index]
  return token && token.sentenceIndex === sentenceIndex ? token : undefined
}

function findNextMeaningfulToken(
  tokens: Parameters<GrammerRule['check']>[0]['tokens'],
  startIndex: number,
  sentenceIndex: number,
  options?: {
    allowPronoun?: boolean
  },
) {
  for (let index = startIndex; index < tokens.length; index += 1) {
    const token = getNextTokenInSentence(tokens, index, sentenceIndex)

    if (!token) {
      return undefined
    }

    if (
      hasPosHint(token, 'adverb') ||
      INTERVENING_ADVERB_WORDS.has(token.normalized)
    ) {
      continue
    }

    if (options?.allowPronoun && hasPosHint(token, 'pronoun')) {
      continue
    }

    return token
  }

  return undefined
}

function isOffsetInsideQuotedText(text: string, offset: number) {
  const { pairs } = analyzeQuotationMarks(text)

  return pairs.some((pair) => offset > pair.open && offset < pair.close)
}

function isTokenInsideBlockquote(
  token: Token,
  blockRanges?: Parameters<GrammerRule['check']>[0]['blockRanges'],
) {
  if (token.blockIndex == null || !blockRanges) {
    return false
  }

  return blockRanges[token.blockIndex]?.kind === 'blockquote'
}

function isTokenInsideSuppressedBlockKind(
  token: Token,
  blockRanges?: Parameters<GrammerRule['check']>[0]['blockRanges'],
) {
  if (token.blockIndex == null || !blockRanges) {
    return false
  }

  const blockKind = blockRanges[token.blockIndex]?.kind
  return blockKind ? SUBJECT_DROP_SUPPRESSED_BLOCK_KINDS.has(blockKind) : false
}

function hasEarlierAuxiliaryOrModalInSentence(
  tokens: Token[],
  candidate: Token,
) {
  return tokens.some(
    (token) =>
      token.sentenceIndex === candidate.sentenceIndex &&
      token.offset < candidate.offset &&
      (hasPosHint(token, 'auxiliary') || hasPosHint(token, 'modal')),
  )
}

function toIngForm(token: Token) {
  const base = getBaseVerbCandidate(token) ?? token.morphology.verb.base

  if (!base) {
    return null
  }

  return toPresentParticiple(base)
}

function hasCreativeWritingRulePack(
  enabledRulePacks: readonly GrammerOptionalRulePack[],
) {
  return enabledRulePacks.some((rulePack) =>
    rulePack.startsWith(CREATIVE_WRITING_RULE_PACK_PREFIX),
  )
}

function getVerbUsageConfidence(candidate: Token): Token['posHintConfidence'] {
  const confidences = [
    candidate.posHintConfidence,
    candidate.morphology.confidence,
    candidate.morphology.verb.confidence,
  ]

  if (confidences.includes('low')) {
    return 'low'
  }

  if (confidences.includes('medium')) {
    return 'medium'
  }

  if (
    candidate.isPosAmbiguous ||
    candidate.morphology.isAmbiguous ||
    candidate.morphology.verb.isAmbiguous
  ) {
    return 'medium'
  }

  return 'high'
}

function createVerbUsageDiagnostics(options: {
  leader: Token
  candidate: Token
  replacement: string
  confidenceLabel: Token['posHintConfidence']
  reason: string
}) {
  const { leader, candidate, replacement, confidenceLabel, reason } = options

  return {
    evidence: [
      `leader:${leader.normalized}`,
      `candidate:${candidate.normalized}`,
      `replacement:${replacement}`,
      `lemma:${candidate.morphology.lemma}`,
      `verbForm:${candidate.morphology.verb.form ?? 'unknown'}`,
      `verbProvenance:${candidate.morphology.verb.provenance ?? 'none'}`,
      `reason:${reason}`,
    ],
    triggerTokens: [leader.normalized, candidate.normalized],
    annotationConfidence: confidenceLabel,
  }
}

export const modalHaveRule: GrammerRule = {
  id: 'MODAL_HAVE',
  name: 'Modal Have',
  description:
    'Flags modal verb phrases like "should of" where "have" is expected instead.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'VERB_USAGE',
    name: 'Verb Usage',
  },
  examples: {
    good: [
      { text: 'We should have left earlier.' },
      { text: 'They might have missed the train.' },
    ],
    bad: [
      { text: 'We should of left earlier.' },
      { text: 'They might of missed the train.' },
    ],
  },
  check({ text, tokens }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const current = tokens[index]
      const next = findNextMeaningfulToken(
        tokens,
        index + 1,
        current.sentenceIndex,
      )

      if (
        MODAL_OF_WORDS.has(current.normalized) &&
        next?.normalized === 'of' &&
        /^\s+/u.test(current.trailingText)
      ) {
        matches.push(
          createMatch({
            text,
            offset: next.offset,
            length: next.length,
            message: `Use "${preserveCase(next.value, 'have')}" after "${current.value}".`,
            replacements: [preserveCase(next.value, 'have')],
            rule: modalHaveRule,
          }),
        )
      }
    }

    return matches
  },
}

export const irregularPastParticipleRule: GrammerRule = {
  id: 'IRREGULAR_PAST_PARTICIPLE',
  name: 'Irregular Past Participle',
  description:
    'Flags a curated set of simple perfect-tense verb phrases that use a past tense form where a past participle is expected.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'VERB_USAGE',
    name: 'Verb Usage',
  },
  examples: {
    good: [
      { text: 'She has gone home already.' },
      { text: 'They had written the summary before lunch.' },
    ],
    bad: [
      { text: 'She has went home already.' },
      { text: 'They had wrote the summary before lunch.' },
    ],
  },
  check({ text, tokens, blockRanges }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const current = tokens[index]
      const next = findNextMeaningfulToken(
        tokens,
        index + 1,
        current.sentenceIndex,
      )
      const replacement = next
        ? getPastParticipleCandidateInPerfectContext({
            leader: current,
            candidate: next,
          })
        : null
      const perfectConfidenceLabel = next
        ? getVerbUsageConfidence(next)
        : undefined

      if (
        next &&
        replacement &&
        perfectConfidenceLabel &&
        perfectConfidenceLabel !== 'low' &&
        /^\s+/u.test(current.trailingText)
      ) {
        matches.push(
          createMatch({
            text,
            offset: next.offset,
            length: next.length,
            message: `Use the past participle "${preserveCase(next.value, replacement)}" after "${current.value}".`,
            replacements: [preserveCase(next.value, replacement)],
            confidenceLabel: perfectConfidenceLabel,
            diagnostics: createVerbUsageDiagnostics({
              leader: current,
              candidate: next,
              replacement,
              confidenceLabel: perfectConfidenceLabel,
              reason: 'perfect-tense-past-participle',
            }),
            rule: irregularPastParticipleRule,
          }),
        )
      }

      const previous = tokens[index - 1]
      const simplePastReplacement = getPastTenseCandidate(current)
      const simplePastConfidenceLabel = getVerbUsageConfidence(current)

      if (
        !simplePastReplacement ||
        simplePastConfidenceLabel === 'low' ||
        !previous ||
        !/^\s+$/u.test(previous.trailingText) ||
        isOffsetInsideQuotedText(text, current.offset) ||
        isTokenInsideBlockquote(current, blockRanges) ||
        hasEarlierAuxiliaryOrModalInSentence(tokens, current) ||
        (!hasPosHint(previous, 'noun') && !hasPosHint(previous, 'pronoun'))
      ) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: current.offset,
          length: current.length,
          message: `Use the simple past "${preserveCase(current.value, simplePastReplacement)}" here instead of the participle "${current.value}".`,
          replacements: [preserveCase(current.value, simplePastReplacement)],
          confidenceLabel: simplePastConfidenceLabel,
          diagnostics: createVerbUsageDiagnostics({
            leader: previous,
            candidate: current,
            replacement: simplePastReplacement,
            confidenceLabel: simplePastConfidenceLabel,
            reason: 'bare-subject-simple-past',
          }),
          rule: irregularPastParticipleRule,
        }),
      )
    }

    return matches
  },
}

export const doSupportBaseVerbRule: GrammerRule = {
  id: 'DO_SUPPORT_BASE_VERB',
  name: 'Do-Support Base Verb',
  description:
    'Flags a curated set of verb forms that should stay in the base form after "do", "does", or "did".',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'VERB_USAGE',
    name: 'Verb Usage',
  },
  examples: {
    good: [
      { text: 'Did she go yesterday?' },
      { text: 'Does he write every morning?' },
    ],
    bad: [
      { text: 'Did she went yesterday?' },
      { text: 'Does he writes every morning?' },
    ],
  },
  check({ text, tokens }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const current = tokens[index]

      if (!DO_SUPPORT_WORDS.has(current.normalized)) {
        continue
      }

      const next = tokens[index + 1]
      const candidate = findNextMeaningfulToken(
        tokens,
        index + 1,
        current.sentenceIndex,
        { allowPronoun: true },
      )

      if (!candidate) {
        continue
      }

      if (
        next &&
        next !== candidate &&
        !DO_SUPPORT_INTERVENING_WORDS.has(next.normalized) &&
        !hasPosHint(next, 'adverb')
      ) {
        continue
      }

      const replacement = getBaseVerbCandidate(candidate)
      const contextualReplacement = getBaseVerbCandidateInAuxiliaryContext({
        leader: current,
        candidate,
      })
      const confidenceLabel = getVerbUsageConfidence(candidate)

      if (
        !replacement ||
        replacement !== contextualReplacement ||
        confidenceLabel === 'low'
      ) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: candidate.offset,
          length: candidate.length,
          message: `Use the base verb "${preserveCase(candidate.value, replacement)}" after "${current.value}".`,
          replacements: [preserveCase(candidate.value, replacement)],
          confidenceLabel,
          diagnostics: createVerbUsageDiagnostics({
            leader: current,
            candidate,
            replacement,
            confidenceLabel,
            reason: 'do-support-base-form',
          }),
          rule: doSupportBaseVerbRule,
        }),
      )
    }

    return matches
  },
}

export const infinitiveBaseVerbRule: GrammerRule = {
  id: 'INFINITIVE_BASE_VERB',
  name: 'Infinitive Base Verb',
  description:
    'Flags common cases where a past-tense or participle verb form appears after "to" where the base infinitive is expected.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'VERB_USAGE',
    name: 'Verb Usage',
  },
  examples: {
    good: [
      { text: 'Sometimes I like to walk to the shops.' },
      { text: 'They want to go home early.' },
    ],
    bad: [
      { text: 'Sometimes I like to walked to the shops.' },
      { text: 'They want to went home early.' },
    ],
  },
  check({ text, tokens, blockRanges }) {
    const matches: Match[] = []
    const activeBlockRanges = blockRanges

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const trigger = tokens[index]
      const toToken = tokens[index + 1]
      const infinitiveCandidate = findNextMeaningfulToken(
        tokens,
        index + 2,
        trigger.sentenceIndex,
      )
      const modalCandidate = findNextMeaningfulToken(
        tokens,
        index + 1,
        trigger.sentenceIndex,
      )
      const isModalContext =
        MODAL_BASE_VERB_WORDS.has(trigger.normalized) ||
        hasPosHint(trigger, 'modal')
      const candidate = isModalContext ? modalCandidate : infinitiveCandidate

      if (
        !candidate ||
        (!isModalContext &&
          (!INFINITIVE_TRIGGER_WORDS.has(trigger.normalized) ||
            toToken?.normalized !== 'to' ||
            !isWhitespaceOnly(
              text,
              trigger.offset + trigger.length,
              toToken.offset,
            ) ||
            !isWhitespaceOnly(
              text,
              toToken.offset + toToken.length,
              candidate.offset,
            ))) ||
        isOffsetInsideQuotedText(text, trigger.offset) ||
        isTokenInsideBlockquote(trigger, activeBlockRanges)
      ) {
        continue
      }

      const replacement = isModalContext
        ? getBaseVerbCandidate(candidate)
        : getBaseVerbCandidateInInfinitiveContext({
            leader: toToken,
            candidate,
          })
      const confidenceLabel = getVerbUsageConfidence(candidate)

      if (
        !replacement ||
        replacement === candidate.normalized ||
        confidenceLabel === 'low'
      ) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: candidate.offset,
          length: candidate.length,
          message: `Use the base verb "${preserveCase(candidate.value, replacement)}" after "${isModalContext ? trigger.value : toToken.value}".`,
          replacements: [preserveCase(candidate.value, replacement)],
          confidenceLabel,
          diagnostics: createVerbUsageDiagnostics({
            leader: isModalContext ? trigger : toToken,
            candidate,
            replacement,
            confidenceLabel,
            reason: isModalContext ? 'modal-base-form' : 'infinitive-base-form',
          }),
          rule: infinitiveBaseVerbRule,
        }),
      )
    }

    return matches
  },
}

export const questionLeadBaseVerbRule: GrammerRule = {
  id: 'QUESTION_LEAD_BASE_VERB',
  name: 'Question Lead Base Verb',
  description:
    'Flags question openings like "Why walked..." where a base verb is expected after the lead question word.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'VERB_USAGE',
    name: 'Verb Usage',
  },
  examples: {
    good: [
      { text: 'Why walk down the street when you can run?' },
      { text: 'Why go home so early?' },
    ],
    bad: [
      { text: 'Why walked down the street when you can run?' },
      { text: 'Why went home so early?' },
    ],
  },
  check({ text, tokens, blockRanges }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const lead = tokens[index]
      const candidate = findNextMeaningfulToken(
        tokens,
        index + 1,
        lead.sentenceIndex,
      )
      const following = candidate
        ? findNextMeaningfulToken(
            tokens,
            candidate.index + 1,
            lead.sentenceIndex,
          )
        : undefined

      if (
        !candidate ||
        !QUESTION_LEAD_WORDS.has(lead.normalized) ||
        !lead.isSentenceStart ||
        !isSentenceLeadToken(text, lead.offset) ||
        !/^\s+/u.test(lead.trailingText) ||
        isOffsetInsideQuotedText(text, lead.offset) ||
        isTokenInsideBlockquote(lead, blockRanges)
      ) {
        continue
      }

      const replacement = getBaseVerbCandidate(candidate)
      const confidenceLabel = getVerbUsageConfidence(candidate)

      if (
        !replacement ||
        replacement === candidate.normalized ||
        confidenceLabel === 'low'
      ) {
        continue
      }

      if (
        !following ||
        !isWhitespaceOnly(
          text,
          candidate.offset + candidate.length,
          following.offset,
        ) ||
        !QUESTION_VERB_FOLLOWERS.has(following.normalized)
      ) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: candidate.offset,
          length: candidate.length,
          message: `Use the base verb "${preserveCase(candidate.value, replacement)}" after "${lead.value}".`,
          replacements: [preserveCase(candidate.value, replacement)],
          confidenceLabel,
          diagnostics: createVerbUsageDiagnostics({
            leader: lead,
            candidate,
            replacement,
            confidenceLabel,
            reason: 'question-lead-base-form',
          }),
          rule: questionLeadBaseVerbRule,
        }),
      )
    }

    return matches
  },
}

export const needsParticipleEllipsisRule: GrammerRule = {
  id: 'NEEDS_PARTICIPLE_ELLIPSIS',
  name: 'Needs Participle Ellipsis',
  description:
    'Flags regional ellipsis patterns like "needs fixed" in ordinary prose and suggests a standard rewrite.',
  shortMessage: 'Grammar',
  issueType: 'style',
  category: {
    id: 'VERB_USAGE',
    name: 'Verb Usage',
  },
  examples: {
    good: [
      { text: 'The draft needs to be fixed before publishing.' },
      { text: 'The draft needs fixing before publishing.' },
    ],
    bad: [{ text: 'The draft needs fixed before publishing.' }],
  },
  check({ text, tokens, blockRanges }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const trigger = tokens[index]
      const candidate = tokens[index + 1]
      const ingReplacement = candidate ? toIngForm(candidate) : null

      if (
        !NEEDS_ELLIPSIS_TRIGGERS.has(trigger.normalized) ||
        !candidate ||
        !candidate.morphology.verb.canBePastParticiple ||
        !candidate.morphology.verb.base ||
        !NEEDS_ELLIPSIS_BASE_VERBS.has(candidate.morphology.verb.base) ||
        !ingReplacement ||
        !isWhitespaceOnly(
          text,
          trigger.offset + trigger.length,
          candidate.offset,
        ) ||
        isOffsetInsideQuotedText(text, trigger.offset) ||
        isTokenInsideBlockquote(trigger, blockRanges)
      ) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: trigger.offset,
          length: candidate.offset + candidate.length - trigger.offset,
          message:
            'Prefer a standard form such as "needs to be fixed" or "needs fixing" here.',
          replacements: [
            `${trigger.value} to be ${candidate.value}`,
            `${trigger.value} ${preserveCase(candidate.value, ingReplacement)}`,
          ],
          rule: needsParticipleEllipsisRule,
        }),
      )
    }

    return matches
  },
}

export const usedToModalStackRule: GrammerRule = {
  id: 'USED_TO_MODAL_STACK',
  name: 'Used To Modal Stack',
  description:
    'Flags regional double-modal patterns like "used to could" in ordinary prose.',
  shortMessage: 'Grammar',
  issueType: 'style',
  category: {
    id: 'VERB_USAGE',
    name: 'Verb Usage',
  },
  examples: {
    good: [
      { text: 'I could finish that in an hour.' },
      { text: 'I used to finish that in an hour.' },
    ],
    bad: [{ text: 'I used to could finish that in an hour.' }],
  },
  check({ text, tokens, blockRanges }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length - 2; index += 1) {
      const used = tokens[index]
      const toToken = tokens[index + 1]
      const modal = tokens[index + 2]

      if (
        used.normalized !== 'used' ||
        toToken?.normalized !== 'to' ||
        !modal ||
        !REGIONAL_MODAL_WORDS.has(modal.normalized) ||
        !isWhitespaceOnly(text, used.offset + used.length, toToken.offset) ||
        !isWhitespaceOnly(
          text,
          toToken.offset + toToken.length,
          modal.offset,
        ) ||
        isOffsetInsideQuotedText(text, used.offset) ||
        isTokenInsideBlockquote(used, blockRanges)
      ) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: used.offset,
          length: modal.offset + modal.length - used.offset,
          message: `Prefer "${modal.value}" or "used to" instead of "${used.value} ${toToken.value} ${modal.value}" in standard prose.`,
          replacements: [modal.value, `${used.value} ${toToken.value}`],
          rule: usedToModalStackRule,
        }),
      )
    }

    return matches
  },
}

export const sentenceInitialSubjectDropRule: GrammerRule = {
  id: 'SENTENCE_INITIAL_SUBJECT_DROP',
  name: 'Sentence-Initial Subject Drop',
  description:
    'Flags narrowly scoped sentence-leading fragments like "Seems like..." or "Appears that..." where standard prose usually supplies an explicit subject.',
  shortMessage: 'Grammar',
  issueType: 'style',
  category: {
    id: 'VERB_USAGE',
    name: 'Verb Usage',
  },
  examples: {
    good: [
      { text: 'It seems like the deploy failed overnight.' },
      { text: 'It appears that the queue is stuck.' },
    ],
    bad: [
      { text: 'Seems like the deploy failed overnight.' },
      { text: 'Appears that the queue is stuck.' },
    ],
  },
  check({ text, tokens, blockRanges, enabledRulePacks }) {
    if (hasCreativeWritingRulePack(enabledRulePacks)) {
      return []
    }

    const matches: Match[] = []

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const lead = tokens[index]
      const complement = tokens[index + 1]

      if (
        !SUBJECT_DROP_LEAD_VERBS.has(lead.normalized) ||
        !complement ||
        !SUBJECT_DROP_COMPLEMENTS.has(complement.normalized) ||
        !lead.isSentenceStart ||
        !isSentenceLeadToken(text, lead.offset) ||
        !isWhitespaceOnly(text, lead.offset + lead.length, complement.offset) ||
        isOffsetInsideQuotedText(text, lead.offset) ||
        isTokenInsideSuppressedBlockKind(lead, blockRanges)
      ) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: lead.offset,
          length: complement.offset + complement.length - lead.offset,
          message: `Add an explicit subject in standard prose, such as "${preserveCase(lead.value, `It ${lead.normalized}`)} ${complement.value} ...".`,
          replacements: [
            `${preserveCase(lead.value, `It ${lead.normalized}`)} ${complement.value}`,
          ],
          rule: sentenceInitialSubjectDropRule,
        }),
      )
    }

    return matches
  },
}

export const verbUsageRules = [
  modalHaveRule,
  irregularPastParticipleRule,
  doSupportBaseVerbRule,
  infinitiveBaseVerbRule,
  questionLeadBaseVerbRule,
  needsParticipleEllipsisRule,
  usedToModalStackRule,
  sentenceInitialSubjectDropRule,
]
