import type { Match } from '../../../../types.js'
import { getStructuredTextSpans } from '../../../rule-helpers.js'
import {
  getMalformedUrlSuggestion,
  isValidEmail,
} from '../../../structured-text.js'
import type { GrammerRule } from '../../../types.js'
import { createMatch } from '../../../utils.js'

export const invalidEmailFormatRule: GrammerRule = {
  id: 'INVALID_EMAIL_FORMAT',
  name: 'Invalid Email Format',
  description:
    'Flags email-like strings that are missing required email structure or contain invalid punctuation.',
  shortMessage: 'Validation',
  issueType: 'misspelling',
  category: {
    id: 'URLS_EMAILS',
    name: 'URLs & Emails',
  },
  examples: {
    good: [
      { text: 'Email support@example.com for help.' },
      { text: 'Try jane.doe+news@example.co.uk.' },
    ],
    bad: [
      { text: 'Email support@example for help.' },
      { text: 'Try jane..doe@example.com.' },
    ],
  },
  check(context) {
    const { text } = context
    const matches: Match[] = []
    const doubleAtEmails = getStructuredTextSpans(context, {
      kind: 'email',
      subtype: 'double-at-email',
    })
    const emailCandidates = getStructuredTextSpans(context, {
      kind: 'email',
      subtype: 'email-candidate',
    })

    for (const span of doubleAtEmails) {
      const candidate = span.text

      matches.push(
        createMatch({
          text,
          offset: span.start,
          length: candidate.length,
          message: 'This email address contains too many "@" symbols.',
          replacements: [candidate.replace('@@', '@')],
          rule: invalidEmailFormatRule,
        }),
      )
    }

    for (const span of emailCandidates) {
      const candidate = span.text

      if (isValidEmail(candidate)) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: span.start,
          length: candidate.length,
          message: 'This email address looks malformed.',
          replacements: [],
          rule: invalidEmailFormatRule,
        }),
      )
    }

    return matches
  },
}

export const missingUrlProtocolRule: GrammerRule = {
  id: 'MISSING_URL_PROTOCOL',
  name: 'Missing URL Protocol',
  description:
    'Flags bare www-style links and suggests adding an explicit HTTPS scheme.',
  shortMessage: 'Validation',
  issueType: 'clarity',
  category: {
    id: 'URLS_EMAILS',
    name: 'URLs & Emails',
  },
  examples: {
    good: [{ text: 'Visit https://www.example.com for details.' }],
    bad: [{ text: 'Visit www.example.com for details.' }],
  },
  check(context) {
    const { text } = context
    const matches: Match[] = []
    const bareUrls = getStructuredTextSpans(context, {
      kind: 'url',
      subtype: 'bare-www-url',
    })

    for (const span of bareUrls) {
      const candidate = span.text

      matches.push(
        createMatch({
          text,
          offset: span.start,
          length: candidate.length,
          message: 'Add a protocol to this URL.',
          replacements: [`https://${candidate}`],
          rule: missingUrlProtocolRule,
        }),
      )
    }

    return matches
  },
}

export const malformedUrlProtocolRule: GrammerRule = {
  id: 'MALFORMED_URL_PROTOCOL',
  name: 'Malformed URL Protocol',
  description: 'Flags URLs whose protocol prefix is missing a slash or colon.',
  shortMessage: 'Validation',
  issueType: 'misspelling',
  category: {
    id: 'URLS_EMAILS',
    name: 'URLs & Emails',
  },
  examples: {
    good: [{ text: 'Open https://example.com/docs next.' }],
    bad: [{ text: 'Open https:/example.com/docs next.' }],
  },
  check(context) {
    const { text } = context
    const matches: Match[] = []
    const malformedUrls = getStructuredTextSpans(context, {
      kind: 'url',
      subtype: 'malformed-url-protocol',
    })

    for (const span of malformedUrls) {
      const candidate = span.text
      const suggestion =
        span.details?.suggestion ?? getMalformedUrlSuggestion(candidate)

      if (!suggestion || suggestion === candidate) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: span.start,
          length: candidate.length,
          message: 'This URL protocol looks malformed.',
          replacements: [suggestion],
          rule: malformedUrlProtocolRule,
        }),
      )
    }

    return matches
  },
}

export const urlsEmailsRules = [
  invalidEmailFormatRule,
  missingUrlProtocolRule,
  malformedUrlProtocolRule,
]
