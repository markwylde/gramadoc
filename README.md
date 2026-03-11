# [gramadoc.com](https://gramadoc.com)

# Gramadoc

Gramadoc is a grammar and writing toolkit for analyzing text and building rich-text editing experiences with inline suggestions.

## Packages

### `@markwylde/gramadoc`

Core analysis engine for grammar, spelling, punctuation, formatting, readability, and structured-text checks.

Install:

```bash
npm install @markwylde/gramadoc
```

Use:

```ts
import { analyzeHtml, analyzeText, htmlToPlainText } from '@markwylde/gramadoc'

const result = analyzeText('I has a apple.')

console.log(result.matches)
console.log(htmlToPlainText('<p>Hello <strong>world</strong></p>'))
console.log(analyzeHtml('<p>I has a apple.</p>').matches)
```

### `@markwylde/gramadoc-react`

React bindings for Gramadoc, including a rich-text input component and a background analysis hook.

Install:

```bash
npm install @markwylde/gramadoc-react
```

You will usually install it alongside React and the core engine:

```bash
npm install react react-dom @markwylde/gramadoc @markwylde/gramadoc-react
```

Use:

```tsx
import { useState } from 'react'
import {
  GramadocInput,
  useGrammerAnalysis,
} from '@markwylde/gramadoc-react'
import '@markwylde/gramadoc-react/styles.css'

export function Editor() {
  const [value, setValue] = useState('<p>I has a apple.</p>')
  const analysis = useGrammerAnalysis({ value })

  return (
    <GramadocInput
      value={value}
      warnings={analysis.warnings}
      analysisPlainText={analysis.plainText}
      onChange={setValue}
      placeholder="Start writing..."
    />
  )
}
```

## Development

This repository is a pnpm workspace.

Install dependencies:

```bash
pnpm install
```

Start development apps:

```bash
pnpm dev
```

Build packages and apps:

```bash
pnpm build
```

Run the core package tests:

```bash
pnpm test
```
