export interface TechnicalCompoundEntry {
  phrase: string
  label: string
}

export const technicalCompoundEntries: TechnicalCompoundEntry[] = [
  {
    phrase: 'api response body',
    label: 'API response body',
  },
  {
    phrase: 'build pipeline',
    label: 'build pipeline',
  },
  {
    phrase: 'customer support',
    label: 'customer support',
  },
  {
    phrase: 'developer experience',
    label: 'developer experience',
  },
  {
    phrase: 'feature flag',
    label: 'feature flag',
  },
  {
    phrase: 'request payload',
    label: 'request payload',
  },
  {
    phrase: 'response body',
    label: 'response body',
  },
  {
    phrase: 'state recovery',
    label: 'state recovery',
  },
  {
    phrase: 'webhook payload',
    label: 'webhook payload',
  },
] as const
