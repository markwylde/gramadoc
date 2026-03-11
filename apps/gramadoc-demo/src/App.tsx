import { useEffect, useState } from 'react'
import './App.css'
import { grammerRules, sampleHtml } from '@markwylde/gramadoc'
import {
  GramadocInput,
  type Match,
  useGrammerAnalysis,
} from '@markwylde/gramadoc-react'

const TERMS_URL = 'https://puzed.com/legal/terms'

const DEMO_CONTENT = sampleHtml
const DOCS_EMPTY = '<p>Try writing a sentence without punctuation</p>'
const DOCS_CUSTOM =
  '<p>this component catches style issues and repeated repeated words</p>'
const DOCS_READ_ONLY =
  '<p>An umbrella is useful.</p><p>This sentence is fine.</p>'

function useHashView() {
  const [view, setView] = useState<'demo' | 'docs'>(() =>
    window.location.hash === '#docs' ? 'docs' : 'demo',
  )

  useEffect(() => {
    const syncView = () =>
      setView(window.location.hash === '#docs' ? 'docs' : 'demo')
    window.addEventListener('hashchange', syncView)
    return () => window.removeEventListener('hashchange', syncView)
  }, [])

  return {
    view,
    setView: (nextView: 'demo' | 'docs') => {
      window.location.hash = nextView === 'docs' ? 'docs' : ''
      setView(nextView)
    },
  }
}

function DebugBlock({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className="debug-card">
      <button
        type="button"
        className="debug-card__toggle"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <h3>{title}</h3>
        <span className="debug-card__chevron">{isOpen ? 'Hide' : 'Show'}</span>
      </button>
      {isOpen && <div className="debug-card__content">{children}</div>}
    </section>
  )
}

function ExampleCard({
  title,
  description,
  children,
  aside,
}: {
  title: string
  description: string
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <article className="example-card">
      <div className="example-card__header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {aside && <div className="example-card__aside">{aside}</div>}
      </div>
      {children}
    </article>
  )
}

function DemoPage() {
  const [content, setContent] = useState(DEMO_CONTENT)
  const [lastClickedWarning, setLastClickedWarning] = useState<Match | null>(
    null,
  )
  const analysis = useGrammerAnalysis({ value: content })

  return (
    <main className="app-main app-main--demo">
      <section className="panel">
        <div className="panel__heading">
          <h2>Demo</h2>
          <p>
            The original playground still lives here, now powered by the public
            <code>GramadocInput</code> component and{' '}
            <code>useGrammerAnalysis</code> hook.
          </p>
        </div>

        <div className="hint-banner">
          Starter content intentionally triggers the demo rules from{' '}
          <code>gramadoc</code>. Hover an underline to inspect a match, click a
          suggestion to apply it, and use <kbd>Ctrl/Cmd+B</kbd>,{' '}
          <kbd>Ctrl/Cmd+I</kbd>, <kbd>Ctrl/Cmd+U</kbd> for formatting.
        </div>

        <GramadocInput
          value={content}
          warnings={analysis.warnings}
          analysisPlainText={analysis.plainText}
          onChange={setContent}
          onMatchSelect={setLastClickedWarning}
          placeholder="Write something a little ungrammatical..."
        />
      </section>

      <section className="panel panel--debug">
        <div className="panel__heading">
          <h2>Debug Info</h2>
          <p>
            Everything the background worker is producing for the live editor.
          </p>
        </div>

        <DebugBlock title="Worker Status" defaultOpen>
          <p className="status-pill">
            {analysis.status === 'ready'
              ? `Ready: ${analysis.warnings.matches.length} warning(s)`
              : analysis.status}
          </p>
        </DebugBlock>

        <DebugBlock title="Current HTML Content">
          <pre>{content}</pre>
        </DebugBlock>

        <DebugBlock title="Extracted Plain Text">
          <pre>{analysis.plainText}</pre>
        </DebugBlock>

        <DebugBlock title="Token Counts">
          <pre>{JSON.stringify(analysis.wordCounts, null, 2)}</pre>
        </DebugBlock>

        {lastClickedWarning && (
          <DebugBlock title="Last Clicked Warning">
            <pre>{JSON.stringify(lastClickedWarning, null, 2)}</pre>
          </DebugBlock>
        )}

        <DebugBlock title="Grammer Rules">
          <div className="rule-list">
            {grammerRules.map((rule) => (
              <article key={rule.id} className="rule-card">
                <div className="rule-heading">
                  <strong>{rule.name}</strong>
                  <span className="rule-meta">
                    {rule.category.name} / {rule.issueType}
                  </span>
                </div>
                <p>{rule.description}</p>
                <div className="rule-examples">
                  <div>
                    <h4>Good</h4>
                    <ul className="rule-example-list rule-example-good">
                      {rule.examples.good.map((example) => (
                        <li key={`${rule.id}-good-${example.text}`}>
                          {example.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Bad</h4>
                    <ul className="rule-example-list rule-example-bad">
                      {rule.examples.bad.map((example) => (
                        <li key={`${rule.id}-bad-${example.text}`}>
                          {example.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </DebugBlock>

        <DebugBlock title="All Warnings">
          <pre>{JSON.stringify(analysis.warnings.matches, null, 2)}</pre>
        </DebugBlock>
      </section>
    </main>
  )
}

function BasicExample() {
  const [content, setContent] = useState(sampleHtml)
  const analysis = useGrammerAnalysis({ value: content })

  return (
    <ExampleCard
      title="Basic Controlled Usage"
      description="The lowest-friction setup: own the HTML value, run the analysis hook, and pass the matches straight through."
      aside={
        <span className="example-badge">
          {analysis.warnings.matches.length} matches
        </span>
      }
    >
      <GramadocInput
        value={content}
        warnings={analysis.warnings}
        analysisPlainText={analysis.plainText}
        onChange={setContent}
      />
    </ExampleCard>
  )
}

function PlaceholderExample() {
  const [content, setContent] = useState('')
  const analysis = useGrammerAnalysis({
    value: content || DOCS_EMPTY,
  })

  return (
    <ExampleCard
      title="Empty State + Placeholder"
      description="Useful for composer-like surfaces where the user starts from nothing but still needs rich-text editing."
      aside={<span className="example-badge">{analysis.status}</span>}
    >
      <GramadocInput
        value={content}
        warnings={
          content ? analysis.warnings : { ...analysis.warnings, matches: [] }
        }
        analysisPlainText={content ? analysis.plainText : ''}
        onChange={setContent}
        placeholder="Draft something messy here..."
        minHeight={180}
      />
    </ExampleCard>
  )
}

function ReadOnlyExample() {
  const analysis = useGrammerAnalysis({ value: DOCS_READ_ONLY })

  return (
    <ExampleCard
      title="Read Only Review"
      description="You can freeze editing and still use the overlay as a review surface for generated or imported content."
      aside={
        <span className="example-badge">
          {analysis.warnings.matches.length} matches
        </span>
      }
    >
      <GramadocInput
        value={DOCS_READ_ONLY}
        warnings={analysis.warnings}
        analysisPlainText={analysis.plainText}
        readOnly
        minHeight={160}
      />
    </ExampleCard>
  )
}

function CustomColorsExample() {
  const [content, setContent] = useState(DOCS_CUSTOM)
  const analysis = useGrammerAnalysis({ value: content })

  return (
    <ExampleCard
      title="Custom Severity Colors"
      description="Underline styling is overridable, so the component can inherit a host product’s visual language."
      aside={
        <span className="example-badge">
          {analysis.warnings.matches.length} matches
        </span>
      }
    >
      <GramadocInput
        value={content}
        warnings={analysis.warnings}
        analysisPlainText={analysis.plainText}
        onChange={setContent}
        getUnderlineColor={(match) => {
          if (match.rule.category.id.toLowerCase().includes('typo')) {
            return '#d7263d'
          }
          if (match.rule.issueType.toLowerCase().includes('grammar')) {
            return '#f59e0b'
          }
          return '#0f766e'
        }}
      />
    </ExampleCard>
  )
}

function IntegrationExample() {
  const [content, setContent] = useState(sampleHtml)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const analysis = useGrammerAnalysis({ value: content })

  return (
    <ExampleCard
      title="Integration Surface"
      description="Selection and replacement events can power external panels, analytics, or AI-assisted workflows."
    >
      <div className="integration-grid">
        <GramadocInput
          value={content}
          warnings={analysis.warnings}
          analysisPlainText={analysis.plainText}
          onChange={setContent}
          onMatchSelect={setSelectedMatch}
        />
        <aside className="inspector-card">
          <h4>Selected match</h4>
          <pre>{JSON.stringify(selectedMatch, null, 2) || 'null'}</pre>
        </aside>
      </div>
    </ExampleCard>
  )
}

function DocsPage() {
  return (
    <main className="app-main app-main--docs">
      <section className="docs-hero">
        <div>
          <p className="eyebrow">Component Docs</p>
          <h2>GramadocInput</h2>
          <p className="docs-intro">
            A reusable rich text editor surface with grammar underlines,
            replacement popovers, and a tiny worker-powered analysis hook.
          </p>
        </div>
        <div className="docs-api">
          <h3>Quick API</h3>
          <code>{'<GramadocInput value warnings onChange />'}</code>
          <code>{'const analysis = useGrammerAnalysis({ value })'}</code>
        </div>
      </section>

      <section className="docs-grid">
        <BasicExample />
        <PlaceholderExample />
        <ReadOnlyExample />
        <CustomColorsExample />
        <IntegrationExample />
      </section>
    </main>
  )
}

function App() {
  const { view, setView } = useHashView()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Grammar Component Lab</p>
          <h1>GramadocInput</h1>
          <p className="app-subtitle">
            The demo is still here, and now there’s a dedicated docs surface
            with interactive examples for the reusable component API.
          </p>
        </div>

        <nav className="top-nav" aria-label="Page navigation">
          <button
            type="button"
            className={
              view === 'demo'
                ? 'top-nav__item top-nav__item--active'
                : 'top-nav__item'
            }
            onClick={() => setView('demo')}
          >
            Demo
          </button>
          <button
            type="button"
            className={
              view === 'docs'
                ? 'top-nav__item top-nav__item--active'
                : 'top-nav__item'
            }
            onClick={() => setView('docs')}
          >
            Docs
          </button>
        </nav>
      </header>

      {view === 'docs' ? <DocsPage /> : <DemoPage />}
      <footer className="app-footer">
        <a href={TERMS_URL} target="_blank" rel="noreferrer">
          © Puzed Ltd
        </a>
      </footer>
    </div>
  )
}

export default App
