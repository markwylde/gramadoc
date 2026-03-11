import type { GrammerLanguageCode } from '../types.js'

export type HouseStyleTermKind =
  | 'preferred-brand-casing'
  | 'legacy-name'
  | 'product-name'
  | 'special-numeral-format'

export type HouseStyleTermScope =
  | 'global'
  | 'organization'
  | 'regional'
  | 'user'
  | 'workspace'

export interface HouseStyleTerm {
  phrase: string
  preferred: string
  kind: HouseStyleTermKind
  message: string
  languageCodes?: readonly GrammerLanguageCode[]
  scope?: HouseStyleTermScope
}

export const preferredBrandCasingTerms: HouseStyleTerm[] = [
  {
    phrase: 'github',
    preferred: 'GitHub',
    kind: 'preferred-brand-casing',
    message: 'Use the preferred brand casing "GitHub".',
    scope: 'global',
  },
  {
    phrase: 'javascript',
    preferred: 'JavaScript',
    kind: 'preferred-brand-casing',
    message: 'Use the preferred brand casing "JavaScript".',
    scope: 'global',
  },
  {
    phrase: 'openai',
    preferred: 'OpenAI',
    kind: 'preferred-brand-casing',
    message: 'Use the preferred brand casing "OpenAI".',
    scope: 'global',
  },
  {
    phrase: 'typescript',
    preferred: 'TypeScript',
    kind: 'preferred-brand-casing',
    message: 'Use the preferred brand casing "TypeScript".',
    scope: 'global',
  },
]

export const legacyHouseStyleTerms: HouseStyleTerm[] = [
  {
    phrase: 'g suite',
    preferred: 'Google Workspace',
    kind: 'legacy-name',
    message:
      'Use the current product name "Google Workspace" instead of the legacy name "G Suite".',
    scope: 'global',
  },
  {
    phrase: 'google data studio',
    preferred: 'Looker Studio',
    kind: 'legacy-name',
    message:
      'Use the current product name "Looker Studio" instead of the legacy name "Google Data Studio".',
    scope: 'global',
  },
]

export const productNamingConventionTerms: HouseStyleTerm[] = [
  {
    phrase: 'github actions',
    preferred: 'GitHub Actions',
    kind: 'product-name',
    message: 'Use the product name "GitHub Actions".',
    scope: 'global',
  },
  {
    phrase: 'visual studio code',
    preferred: 'Visual Studio Code',
    kind: 'product-name',
    message: 'Use the product name "Visual Studio Code".',
    scope: 'global',
  },
]

export const specialNumeralFormatTerms: HouseStyleTerm[] = [
  {
    phrase: 'ipv4',
    preferred: 'IPv4',
    kind: 'special-numeral-format',
    message: 'Use the network-standard casing "IPv4".',
    scope: 'global',
  },
  {
    phrase: 'ipv6',
    preferred: 'IPv6',
    kind: 'special-numeral-format',
    message: 'Use the network-standard casing "IPv6".',
    scope: 'global',
  },
]

export const houseStyleTerms: HouseStyleTerm[] = [
  // Put longer multi-token conventions first so they win over overlapping
  // single-token brand matches at the same offset.
  ...productNamingConventionTerms,
  ...legacyHouseStyleTerms,
  ...preferredBrandCasingTerms,
  ...specialNumeralFormatTerms,
]
