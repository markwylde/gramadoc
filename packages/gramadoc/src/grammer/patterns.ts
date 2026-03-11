import type { Match } from '../types.js'
import type { GrammerRule, RuleCheckContext, Token } from './types.js'
import { createMatch } from './utils.js'

export interface PatternTokenStep {
  type?: 'token'
  optional?: boolean
  capture?: string
  literal?: string | string[]
  regex?: string
  flags?: string
  field?: 'normalized' | 'value'
  test?: (token: Token, context: RuleCheckContext) => boolean
}

export interface PatternSkipStep {
  type: 'skip'
  min?: number
  max: number
}

export type PatternStep = PatternTokenStep | PatternSkipStep

export interface PatternMatch {
  startIndex: number
  endIndex: number
  tokens: Token[]
  captures: Record<string, Token[]>
}

interface CompiledPatternTokenStep extends PatternTokenStep {
  compiledRegex?: RegExp
}

type CompiledPatternStep = CompiledPatternTokenStep | PatternSkipStep

interface PatternState {
  tokenIndex: number
  matchedTokens: Token[]
  captures: Record<string, Token[]>
}

export interface PatternRuleDefinition {
  id: string
  name: string
  description: string
  shortMessage: string
  issueType: string
  category: GrammerRule['category']
  examples: GrammerRule['examples']
  scope?: GrammerRule['scope']
  pattern: PatternStep[] | PatternStep[][]
  antiPatterns?: PatternStep[][]
  antiPatternScope?: 'same-start' | 'match-span'
  reportCapture?: string
  message:
    | string
    | ((
        match: PatternMatch,
        context: RuleCheckContext,
        rule: GrammerRule,
      ) => string)
  replacements?:
    | string[]
    | ((
        match: PatternMatch,
        context: RuleCheckContext,
        rule: GrammerRule,
      ) => string[])
  filter?: (match: PatternMatch, context: RuleCheckContext) => boolean
}

export interface SingleWordPatternDefinition<T extends { word: string }> {
  id: string
  name: string
  description: string
  shortMessage: string
  issueType: string
  category: GrammerRule['category']
  examples: GrammerRule['examples']
  scope?: GrammerRule['scope']
  patterns: T[]
  message: (pattern: T, token: Token) => string
  replacements: (pattern: T, token: Token) => string[]
  filter?: (pattern: T, token: Token, context: RuleCheckContext) => boolean
}

function isSkipStep(step: PatternStep): step is PatternSkipStep {
  return step.type === 'skip'
}

function isCompiledSkipStep(
  step: CompiledPatternStep,
): step is PatternSkipStep {
  return step.type === 'skip'
}

function getTokenField(
  token: Token,
  field: PatternTokenStep['field'] = 'normalized',
) {
  return field === 'value' ? token.value : token.normalized
}

function matchesPatternToken(
  token: Token,
  step: CompiledPatternTokenStep,
  context: RuleCheckContext,
) {
  if (step.literal) {
    const literals = Array.isArray(step.literal) ? step.literal : [step.literal]

    if (!literals.includes(getTokenField(token, step.field))) {
      return false
    }
  }

  if (step.compiledRegex) {
    step.compiledRegex.lastIndex = 0

    if (!step.compiledRegex.test(getTokenField(token, step.field))) {
      return false
    }
  }

  if (step.regex && !step.compiledRegex) {
    const regex = new RegExp(step.regex, sanitizeRegexFlags(step.flags))

    if (!regex.test(getTokenField(token, step.field))) {
      return false
    }
  }

  if (step.test && !step.test(token, context)) {
    return false
  }

  return true
}

function appendCapture(
  captures: Record<string, Token[]>,
  capture: string | undefined,
  token: Token,
) {
  if (!capture) {
    return captures
  }

  return {
    ...captures,
    [capture]: [...(captures[capture] ?? []), token],
  }
}

function dedupePatternMatches(matches: PatternMatch[]) {
  const bestByKey = new Map<string, PatternMatch>()

  for (const match of matches) {
    const captureKey = Object.entries(match.captures)
      .map(
        ([name, tokens]) =>
          `${name}:${tokens.map((token) => token.index).join(',')}`,
      )
      .sort()
      .join('|')
    const key = `${match.startIndex}:${captureKey}`
    const existing = bestByKey.get(key)

    if (
      existing === undefined ||
      match.endIndex > existing.endIndex ||
      match.tokens.length > existing.tokens.length
    ) {
      bestByKey.set(key, match)
    }
  }

  return [...bestByKey.values()]
}

function matchPatternFromIndex(
  context: RuleCheckContext,
  pattern: CompiledPatternStep[],
  startIndex: number,
) {
  const { tokens } = context
  let states: PatternState[] = [
    {
      tokenIndex: startIndex,
      matchedTokens: [],
      captures: {},
    },
  ]

  for (const step of pattern) {
    const nextStates: PatternState[] = []

    for (const state of states) {
      if (isCompiledSkipStep(step)) {
        const min = step.min ?? 0

        for (let offset = min; offset <= step.max; offset += 1) {
          const nextIndex = state.tokenIndex + offset

          if (nextIndex > tokens.length) {
            continue
          }

          nextStates.push({
            tokenIndex: nextIndex,
            matchedTokens: [...state.matchedTokens],
            captures: { ...state.captures },
          })
        }

        continue
      }

      const token = tokens[state.tokenIndex]

      if (!token) {
        if (step.optional) {
          nextStates.push({
            tokenIndex: state.tokenIndex,
            matchedTokens: [...state.matchedTokens],
            captures: { ...state.captures },
          })
        }

        continue
      }

      if (matchesPatternToken(token, step, context)) {
        nextStates.push({
          tokenIndex: state.tokenIndex + 1,
          matchedTokens: [...state.matchedTokens, token],
          captures: appendCapture(state.captures, step.capture, token),
        })
      }

      if (step.optional) {
        nextStates.push({
          tokenIndex: state.tokenIndex,
          matchedTokens: [...state.matchedTokens],
          captures: { ...state.captures },
        })
      }
    }

    states = nextStates

    if (states.length === 0) {
      return []
    }
  }

  return dedupePatternMatches(
    states
      .filter((state) => state.matchedTokens.length > 0)
      .map((state) => ({
        startIndex,
        endIndex: state.tokenIndex - 1,
        tokens: state.matchedTokens,
        captures: state.captures,
      })),
  )
}

export function findPatternMatches(
  context: RuleCheckContext,
  pattern: PatternStep[],
) {
  const compiledPattern = getCompiledPattern(pattern)

  return dedupePatternMatches(
    context.tokens.flatMap((_, index) =>
      matchPatternFromIndex(context, compiledPattern, index),
    ),
  )
}

function renderTemplate(template: string, match: PatternMatch) {
  const fullMatch = match.tokens.map((token) => token.value).join(' ')

  return template
    .replaceAll('{match}', fullMatch)
    .replaceAll(/\{([a-zA-Z0-9_-]+)\}/g, (_, captureName: string) =>
      (match.captures[captureName] ?? []).map((token) => token.value).join(' '),
    )
}

function hasAntiPatternMatch(
  context: RuleCheckContext,
  match: PatternMatch,
  antiPattern: PatternStep[],
  scope: PatternRuleDefinition['antiPatternScope'] = 'same-start',
) {
  const compiledAntiPattern = getCompiledPattern(antiPattern)

  if (scope === 'same-start') {
    return (
      matchPatternFromIndex(context, compiledAntiPattern, match.startIndex)
        .length > 0
    )
  }

  for (let index = match.startIndex; index <= match.endIndex; index += 1) {
    if (matchPatternFromIndex(context, compiledAntiPattern, index).length > 0) {
      return true
    }
  }

  return false
}

const compiledPatternCache = new WeakMap<PatternStep[], CompiledPatternStep[]>()

function sanitizeRegexFlags(flags?: string) {
  return (flags ?? '').replace(/[gy]/gu, '')
}

function getCompiledPattern(pattern: PatternStep[]) {
  const cached = compiledPatternCache.get(pattern)

  if (cached) {
    return cached
  }

  const compiledPattern = pattern.map((step) =>
    isSkipStep(step)
      ? step
      : {
          ...step,
          compiledRegex: step.regex
            ? new RegExp(step.regex, sanitizeRegexFlags(step.flags))
            : undefined,
        },
  )

  compiledPatternCache.set(pattern, compiledPattern)

  return compiledPattern
}

export function createPatternRule(
  definition: PatternRuleDefinition,
): GrammerRule {
  const rule: GrammerRule = {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    shortMessage: definition.shortMessage,
    issueType: definition.issueType,
    category: definition.category,
    examples: definition.examples,
    scope: definition.scope,
    check(context) {
      const patternMatches = dedupePatternMatches(
        normalizePatternList(definition.pattern).flatMap((pattern) =>
          findPatternMatches(context, pattern),
        ),
      )
        .filter((patternMatch) =>
          definition.filter ? definition.filter(patternMatch, context) : true,
        )
        .filter((patternMatch) =>
          (definition.antiPatterns ?? []).every(
            (antiPattern) =>
              !hasAntiPatternMatch(
                context,
                patternMatch,
                antiPattern,
                definition.antiPatternScope,
              ),
          ),
        )

      return sortMatches(
        patternMatches.map((patternMatch) => {
          const reportTokens =
            definition.reportCapture === undefined
              ? patternMatch.tokens
              : (patternMatch.captures[definition.reportCapture] ??
                patternMatch.tokens)
          const firstToken = reportTokens[0]
          const lastToken = reportTokens.at(-1) ?? firstToken
          const replacements =
            typeof definition.replacements === 'function'
              ? definition.replacements(patternMatch, context, rule)
              : (definition.replacements ?? []).map((replacement) =>
                  renderTemplate(replacement, patternMatch),
                )
          const message =
            typeof definition.message === 'function'
              ? definition.message(patternMatch, context, rule)
              : renderTemplate(definition.message, patternMatch)

          return createMatch({
            text: context.text,
            offset: firstToken.offset,
            length: lastToken.offset + lastToken.length - firstToken.offset,
            message,
            replacements,
            rule,
          })
        }),
      )
    },
  }

  return rule
}

export function createSingleWordPatternRule<T extends { word: string }>(
  definition: SingleWordPatternDefinition<T>,
) {
  const patternsByWord = new Map(
    definition.patterns.map((pattern) => [pattern.word, pattern] as const),
  )

  return createPatternRule({
    id: definition.id,
    name: definition.name,
    description: definition.description,
    shortMessage: definition.shortMessage,
    issueType: definition.issueType,
    category: definition.category,
    examples: definition.examples,
    scope: definition.scope,
    pattern: [
      {
        literal: definition.patterns.map((pattern) => pattern.word),
        capture: 'target',
      },
    ],
    reportCapture: 'target',
    message: (match) => {
      const token = match.captures.target?.[0]

      if (!token) {
        return ''
      }

      const pattern = patternsByWord.get(token.normalized)

      return pattern ? definition.message(pattern, token) : ''
    },
    replacements: (match) => {
      const token = match.captures.target?.[0]

      if (!token) {
        return []
      }

      const pattern = patternsByWord.get(token.normalized)

      return pattern ? definition.replacements(pattern, token) : []
    },
    filter: (match, context) => {
      const token = match.captures.target?.[0]

      if (!token) {
        return false
      }

      const pattern = patternsByWord.get(token.normalized)

      if (!pattern) {
        return false
      }

      return definition.filter
        ? definition.filter(pattern, token, context)
        : true
    },
  })
}

function normalizePatternList(pattern: PatternRuleDefinition['pattern']) {
  if (pattern.length === 0) {
    return []
  }

  return Array.isArray(pattern[0])
    ? (pattern as PatternStep[][])
    : [pattern as PatternStep[]]
}

export function literalPhraseToPattern(
  phrase: string,
  options?: {
    captureName?: string
    reportWordIndex?: number
  },
) {
  const words = phrase.trim().split(/\s+/u)

  return words.map((word, index) => ({
    literal: word.toLowerCase(),
    capture:
      options?.captureName &&
      index === (options.reportWordIndex ?? words.length - 1)
        ? options.captureName
        : undefined,
  })) satisfies PatternStep[]
}

export function tokensToText(tokens: Token[]) {
  return tokens.map((token) => token.value).join(' ')
}

export function getSentenceTokens(
  context: RuleCheckContext,
  sentenceIndex: number,
) {
  return context.sentenceTokens[sentenceIndex] ?? []
}

export function getParagraphTokens(
  context: RuleCheckContext,
  paragraphRange: { index?: number; start: number; end: number },
) {
  if (paragraphRange.index !== undefined) {
    return context.paragraphTokens[paragraphRange.index] ?? []
  }

  return context.tokens.filter(
    (token) =>
      token.offset >= paragraphRange.start &&
      token.offset + token.length <= paragraphRange.end,
  )
}

export function getMatchOffsets(match: PatternMatch) {
  const firstToken = match.tokens[0]
  const lastToken = match.tokens.at(-1) ?? firstToken

  return {
    offset: firstToken.offset,
    length: lastToken.offset + lastToken.length - firstToken.offset,
  }
}

export function sortMatches(matches: Match[]) {
  return [...matches].sort((left, right) => {
    if (left.offset !== right.offset) {
      return left.offset - right.offset
    }

    if (left.length !== right.length) {
      return left.length - right.length
    }

    return left.rule.id.localeCompare(right.rule.id)
  })
}
