export interface LexicalConsistencyGroup {
  id: string
  name: string
  variants: string[]
  preferred: string
}

export const lexicalConsistencyGroups: LexicalConsistencyGroup[] = [
  {
    id: 'EMAIL_STYLE',
    name: 'Email Style',
    variants: ['email', 'e-mail'],
    preferred: 'email',
  },
  {
    id: 'WEBSITE_STYLE',
    name: 'Website Style',
    variants: ['website', 'web site', 'web-site'],
    preferred: 'website',
  },
  {
    id: 'COWORKER_STYLE',
    name: 'Coworker Style',
    variants: ['coworker', 'co-worker'],
    preferred: 'coworker',
  },
]
