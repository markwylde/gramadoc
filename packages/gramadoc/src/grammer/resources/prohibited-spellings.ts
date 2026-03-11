export interface ProhibitedSpelling {
  value: string
  replacement: string
}

export const prohibitedSpellings: ProhibitedSpelling[] = [
  { value: 'co-worker', replacement: 'coworker' },
  { value: 'e-mail', replacement: 'email' },
  { value: 'web-site', replacement: 'website' },
]
