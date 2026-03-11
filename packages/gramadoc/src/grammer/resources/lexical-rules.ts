import type {
  GrammerLanguageCode,
  LexicalRuleMetadata,
  TextBlockKind,
} from '../types.js'

export interface LexicalContextGuard {
  blockKinds?: TextBlockKind[]
  previousTokenValues?: string[]
  nextTokenValues?: string[]
  previousLemmas?: string[]
  nextLemmas?: string[]
}

export interface LexicalRuleResourceBase {
  id: string
  message: string
  metadata: LexicalRuleMetadata
  guard?: LexicalContextGuard
}

export interface LexicalPhraseRuleResource extends LexicalRuleResourceBase {
  phrase: string
  replacements?: string[]
}

export interface LexicalTokenRuleResource extends LexicalRuleResourceBase {
  token: string
  replacements?: string[]
}

export interface LexicalRuleValidationIssue {
  entryId: string
  message: string
}

function hasBlankValues(values?: string[]) {
  return values?.some((value) => value.trim().length === 0) ?? false
}

function hasInvalidVariantRestrictions(variants?: GrammerLanguageCode[]) {
  return variants?.some(
    (variant) => !['en', 'en-US', 'en-GB'].includes(variant),
  )
}

export function validateLexicalRuleResources(
  entries: LexicalRuleResourceBase[],
): LexicalRuleValidationIssue[] {
  const issues: LexicalRuleValidationIssue[] = []
  const seenIds = new Set<string>()

  for (const entry of entries) {
    if (!entry.id.trim()) {
      issues.push({
        entryId: entry.id,
        message: 'Lexical rule ids must not be blank.',
      })
    }

    if (seenIds.has(entry.id)) {
      issues.push({
        entryId: entry.id,
        message: 'Lexical rule ids must be unique within a pack.',
      })
    }

    seenIds.add(entry.id)

    if (!entry.message.trim()) {
      issues.push({
        entryId: entry.id,
        message: 'Lexical rule messages must not be blank.',
      })
    }

    if (!entry.metadata.category.trim()) {
      issues.push({
        entryId: entry.id,
        message: 'Lexical rule metadata requires a category.',
      })
    }

    if (hasBlankValues(entry.metadata.allowlist)) {
      issues.push({
        entryId: entry.id,
        message: 'Allowlist entries must not be blank.',
      })
    }

    if (hasBlankValues(entry.metadata.antiPatterns)) {
      issues.push({
        entryId: entry.id,
        message: 'Anti-pattern entries must not be blank.',
      })
    }

    if (hasInvalidVariantRestrictions(entry.metadata.variantRestrictions)) {
      issues.push({
        entryId: entry.id,
        message: 'Variant restrictions must use supported English codes.',
      })
    }

    if (
      entry.metadata.exampleCoverage &&
      (entry.metadata.exampleCoverage.good.length === 0 ||
        entry.metadata.exampleCoverage.bad.length === 0)
    ) {
      issues.push({
        entryId: entry.id,
        message:
          'Example coverage must include at least one good and one bad example.',
      })
    }
  }

  return issues
}
