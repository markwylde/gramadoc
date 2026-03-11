import { createServer } from 'node:http'
import { analyzeHtml, analyzeText } from '../../gramadoc/dist/grammer/utils.js'

const DEFAULT_PORT = 3002
const MAX_BODY_SIZE_BYTES = 1024 * 1024
const RELEASES_URL = 'https://github.com/markwylde/gramadoc/releases'
const RELEASE_TAG = process.env.RELEASE_TAG ?? 'dev'
const RELEASE_URL =
  process.env.RELEASE_URL ??
  (RELEASE_TAG.startsWith('v')
    ? `${RELEASES_URL}/tag/${RELEASE_TAG}`
    : RELEASES_URL)

interface AnalyzeRequestBody {
  text?: unknown
  html?: unknown
}

function setCorsHeaders(response: {
  setHeader: (name: string, value: string) => void
}) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
}

function sendJson(
  response: {
    statusCode: number
    setHeader: (name: string, value: string) => void
    end: (chunk?: string) => void
  },
  statusCode: number,
  body: unknown,
) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  setCorsHeaders(response)
  response.end(JSON.stringify(body))
}

function sendHtml(
  response: {
    statusCode: number
    setHeader: (name: string, value: string) => void
    end: (chunk?: string) => void
  },
  statusCode: number,
  body: string,
) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  setCorsHeaders(response)
  response.end(body)
}

async function readJsonBody(request: AsyncIterable<string>) {
  let body = ''

  for await (const chunk of request) {
    body += chunk

    if (body.length > MAX_BODY_SIZE_BYTES) {
      throw new Error('Request body too large')
    }
  }

  if (!body) {
    return {}
  }

  return JSON.parse(body) as AnalyzeRequestBody
}

function parseAnalyzeInput(body: AnalyzeRequestBody) {
  if (typeof body.html === 'string') {
    return {
      inputType: 'html' as const,
      content: body.html,
    }
  }

  if (typeof body.text === 'string') {
    return {
      inputType: 'text' as const,
      content: body.text,
    }
  }

  return null
}

function renderHomePage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Gramadoc API — Precision Grammar Analysis</title>
    <style>
      :root {
        --bg: #09090b;
        --card-bg: #111114;
        --fg: #fafafa;
        --muted: #a1a1aa;
        --border: #27272a;
        --accent: #3b82f6;
        --accent-glow: rgba(59, 130, 246, 0.15);
        --success: #10b981;
        --code-bg: #18181b;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: 'Inter', -apple-system, system-ui, sans-serif;
        background-color: var(--bg);
        color: var(--fg);
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
      }

      .container {
        max-width: 1100px;
        margin: 0 auto;
        padding: 6rem 1.5rem;
      }

      header {
        margin-bottom: 5rem;
        text-align: left;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        background: var(--accent-glow);
        color: var(--accent);
        font-size: 0.75rem;
        font-weight: 600;
        border: 1px solid rgba(59, 130, 246, 0.3);
        margin-bottom: 1.5rem;
      }

      h1 {
        font-size: clamp(2.5rem, 8vw, 4.5rem);
        font-weight: 800;
        letter-spacing: -0.04em;
        margin: 0 0 1.5rem;
        line-height: 1;
        background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .description {
        font-size: 1.25rem;
        color: var(--muted);
        max-width: 650px;
        margin: 0;
      }

      /* Demo Section */
      .demo-section {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 1.25rem;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        margin-bottom: 6rem;
        display: flex;
        flex-direction: column;
      }

      .demo-header {
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.02);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .demo-controls {
        display: flex;
        align-items: center;
        gap: 1.5rem;
      }

      .demo-title {
        font-weight: 600;
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }

      .demo-tabs {
        display: flex;
        background: #000;
        padding: 0.25rem;
        border-radius: 0.5rem;
        gap: 0.25rem;
      }

      .tab-btn {
        background: none;
        border: none;
        padding: 0.4rem 1rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--muted);
        cursor: pointer;
        border-radius: 0.375rem;
        transition: all 0.2s;
      }

      .tab-btn.active {
        background: var(--border);
        color: var(--fg);
      }

      .demo-body {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        min-height: 450px;
      }

      @media (max-width: 900px) {
        .demo-body { grid-template-columns: 1fr; }
      }

      .demo-input {
        padding: 2rem;
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        background: #000;
      }

      .demo-output {
        padding: 0;
        background: var(--code-bg);
        overflow: auto;
        position: relative;
      }

      textarea {
        flex: 1;
        width: 100%;
        border: none;
        resize: none;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 0.95rem;
        color: var(--fg);
        background: transparent;
        outline: none;
        min-height: 250px;
        line-height: 1.7;
      }

      .btn-analyze {
        margin-top: 1.5rem;
        background: var(--accent);
        color: #fff;
        border: none;
        padding: 0.875rem 1.5rem;
        border-radius: 0.75rem;
        font-weight: 700;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }

      .btn-analyze:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
      }

      .btn-analyze:active { transform: translateY(0); }
      .btn-analyze:disabled { opacity: 0.5; cursor: not-allowed; }

      pre {
        margin: 0;
        padding: 2rem;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 0.85rem;
        color: #d1d5db;
        line-height: 1.6;
      }

      .status-indicator {
        position: absolute;
        top: 1rem;
        right: 1rem;
        padding: 0.25rem 0.6rem;
        border-radius: 0.375rem;
        font-size: 0.7rem;
        font-weight: 700;
        background: #27272a;
        color: var(--muted);
        letter-spacing: 0.05em;
        z-index: 10;
      }

      .status-indicator.success { color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2); }

      /* JSON Viewer Styles */
      .json-item { margin-bottom: 0.125rem; }
      .json-collapsible { display: block; }
      .json-collapsible summary {
        list-style: none;
        cursor: pointer;
        outline: none;
        color: var(--muted);
        display: inline-flex;
        align-items: center;
        user-select: none;
      }
      .json-collapsible summary::-webkit-details-marker { display: none; }
      .json-collapsible summary::before {
        content: '';
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid var(--muted);
        margin-right: 8px;
        transition: transform 0.2s;
        transform: rotate(-90deg);
      }
      .json-collapsible[open] > summary::before { transform: rotate(0deg); }
      .json-collapsible:not([open]) > summary::after {
        content: '...';
        background: rgba(255, 255, 255, 0.05);
        padding: 0 6px;
        border-radius: 4px;
        margin-left: 8px;
        font-size: 0.75rem;
        color: var(--muted);
      }
      .json-content {
        padding-left: 1.25rem;
        border-left: 1px solid var(--border);
        margin-left: 4px;
        margin-top: 0.125rem;
      }
      .json-key { color: #818cf8; font-weight: 500; }
      .json-string { color: #34d399; }
      .json-number { color: #f87171; }
      .json-boolean { color: #fbbf24; }
      .json-null { color: #71717a; }

      /* Feature Grid */
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 1.5rem;
      }

      .card {
        background: var(--card-bg);
        border: 1px solid var(--border);
        padding: 2.5rem;
        border-radius: 1.25rem;
        transition: border-color 0.2s;
      }

      .card:hover { border-color: #3f3f46; }

      h2 {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 1rem;
        letter-spacing: -0.02em;
      }

      .card p, .card li {
        font-size: 1rem;
        color: var(--muted);
      }

      code {
        font-family: 'JetBrains Mono', monospace;
        background: #27272a;
        padding: 0.2rem 0.4rem;
        border-radius: 0.25rem;
        color: #e4e4e7;
        font-size: 0.85rem;
      }

      .endpoint {
        background: #000;
        padding: 1rem;
        border-radius: 0.75rem;
        border: 1px solid var(--border);
        font-family: 'JetBrains Mono', monospace;
        margin: 1.5rem 0;
        font-size: 0.9rem;
      }

      .method { color: var(--success); font-weight: 800; margin-right: 0.75rem; }

      footer {
        margin-top: 8rem;
        padding-top: 4rem;
        border-top: 1px solid var(--border);
        text-align: center;
        color: var(--muted);
        font-size: 0.875rem;
      }

      .footer-meta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.85rem;
        flex-wrap: wrap;
      }

      .footer-separator {
        width: 4px;
        height: 4px;
        border-radius: 9999px;
        background: #52525b;
      }

      .footer-link {
        color: var(--fg);
        text-decoration: none;
        border-bottom: 1px solid rgba(250, 250, 250, 0.18);
        padding-bottom: 1px;
      }

      .footer-link:hover {
        border-bottom-color: rgba(250, 250, 250, 0.45);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <span class="badge">${RELEASE_TAG}</span>
        <h1>Grammar as Code.</h1>
        <p class="description">
          The high-performance API for developers who care about written precision. Analyze text and HTML at scale with sub-50ms latency.
        </p>
      </header>

      <section class="demo-section">
        <div class="demo-header">
          <div class="demo-title"><div class="dot"></div> API Sandbox</div>
          <div class="demo-controls">
            <div class="demo-tabs">
              <button class="tab-btn active" onclick="setMode('text')">PLAINTEXT</button>
              <button class="tab-btn" onclick="setMode('html')">HTML</button>
            </div>
          </div>
        </div>
        <div class="demo-body">
          <div class="demo-input">
            <textarea id="input" spellcheck="false">This are example text with some grammar mistakes. We should corrects them.</textarea>
            <button id="analyze-btn" class="btn-analyze" onclick="runAnalyze()">
              POST /v1/analyze
            </button>
          </div>
          <div class="demo-output">
            <div id="status" class="status-indicator">READY</div>
            <pre id="output">// Results will be streamed here...</pre>
          </div>
        </div>
      </section>

      <div class="grid">
        <article class="card">
          <h2>Seamless Integration</h2>
          <p>Built for modern stacks. Simple JSON interface with zero-config setup.</p>
          <div class="endpoint"><span class="method">POST</span>/v1/analyze</div>
          <ul style="padding-left: 1.25rem;">
            <li>Auto-detects language structure</li>
            <li>Handles nested HTML tags with precision</li>
            <li>Optimized for CI/CD pipelines</li>
          </ul>
        </article>

        <article class="card">
          <h2>Developer First</h2>
          <p>Everything you need to build grammar-aware applications.</p>
          <div class="endpoint"><span class="method">GET</span>/health</div>
          <p>Prometheus-compatible health checks and comprehensive error reporting via standard HTTP codes.</p>
        </article>

        <article class="card">
          <h2>Deep Analysis</h2>
          <p>Not just a spellchecker. We analyze the soul of your content.</p>
          <ul style="padding-left: 1.25rem; margin-top: 1rem;">
            <li>Syntax & Tense validation</li>
            <li>Readability (Flesch-Kincaid)</li>
            <li>Context-aware suggestions</li>
            <li>Document structure mapping</li>
          </ul>
        </article>
      </div>

      <footer>
        <div class="footer-meta">
          <span>&copy; 2026 Puzed Ltd</span>
          <span class="footer-separator" aria-hidden="true"></span>
          <a class="footer-link" href="${RELEASE_URL}">${RELEASE_TAG}</a>
          <span class="footer-separator" aria-hidden="true"></span>
          <span>support@puzed.com</span>
          <span class="footer-separator" aria-hidden="true"></span>
          <a class="footer-link" href="https://puzed.com/legal/terms">Terms</a>
        </div>
      </footer>
    </div>

    <script>
      let mode = 'text';
      const inputEl = document.getElementById('input');
      const outputEl = document.getElementById('output');
      const statusEl = document.getElementById('status');
      const btnEl = document.getElementById('analyze-btn');

      const examples = {
        text: 'This are example text with some grammar mistakes. We should corrects them.',
        html: '<article>\\n  <h1>Grammer test</h1>\\n  <p>This are mistakes inside HTML.</p>\\n</article>'
      };

      function setMode(newMode) {
        mode = newMode;
        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.classList.toggle('active', btn.innerText.toLowerCase() === mode);
        });
        inputEl.value = examples[mode];
        outputEl.innerHTML = '// Results will be streamed here...';
        statusEl.innerText = 'READY';
        statusEl.className = 'status-indicator';
        btnEl.innerText = 'POST /v1/analyze';
      }

      function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
      }

      function formatJson(obj, isLast = true) {
        if (obj === null) return \`<span class="json-null">null</span>\${isLast ? '' : ','}\`;
        if (typeof obj === 'number') return \`<span class="json-number">\${obj}</span>\${isLast ? '' : ','}\`;
        if (typeof obj === 'boolean') return \`<span class="json-boolean">\${obj}</span>\${isLast ? '' : ','}\`;
        if (typeof obj === 'string') return \`<span class="json-string">"\${escapeHtml(obj)}"</span>\${isLast ? '' : ','}\`;

        if (Array.isArray(obj)) {
          if (obj.length === 0) return '[]' + (isLast ? '' : ',');
          let html = '<details open class="json-collapsible"><summary>[</summary><div class="json-content">';
          for (let i = 0; i < obj.length; i++) {
            html += '<div class="json-item">' + formatJson(obj[i], i === obj.length - 1) + '</div>';
          }
          html += '</div><span>]</span>' + (isLast ? '' : ',') + '</details>';
          return html;
        }

        if (typeof obj === 'object') {
          const keys = Object.keys(obj);
          if (keys.length === 0) return '{}' + (isLast ? '' : ',');
          let html = '<details open class="json-collapsible"><summary>{</summary><div class="json-content">';
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            html += '<div class="json-item"><span class="json-key">"' + escapeHtml(key) + '"</span>: ' + formatJson(obj[key], i === keys.length - 1) + '</div>';
          }
          html += '</div><span>}</span>' + (isLast ? '' : ',') + '</details>';
          return html;
        }
      }

      async function runAnalyze() {
        const content = inputEl.value;
        statusEl.innerText = 'PROCESSING...';
        statusEl.className = 'status-indicator';
        btnEl.disabled = true;

        try {
          const response = await fetch('/v1/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [mode]: content })
          });

          const data = await response.json();
          outputEl.innerHTML = formatJson(data);
          statusEl.innerText = response.ok ? '200 OK' : 'ERROR';
          if (response.ok) statusEl.classList.add('success');
        } catch (err) {
          outputEl.innerHTML = '// Connection Error\\n' + escapeHtml(err.message);
          statusEl.innerText = 'FAILED';
        } finally {
          btnEl.disabled = false;
        }
      }
    </script>
  </body>
</html>`
}

export function createApiServer() {
  return createServer(async (request, response) => {
    const method = request.method ?? 'GET'
    const url = new URL(request.url ?? '/', 'http://localhost')

    if (method === 'OPTIONS') {
      response.statusCode = 204
      setCorsHeaders(response)
      response.end()
      return
    }

    if (method === 'GET' && url.pathname === '/health') {
      sendJson(response, 200, {
        status: 'ok',
      })
      return
    }

    if (method === 'GET' && url.pathname === '/') {
      sendHtml(response, 200, renderHomePage())
      return
    }

    if (
      method === 'POST' &&
      (url.pathname === '/analyze' || url.pathname === '/v1/analyze')
    ) {
      try {
        const body = await readJsonBody(request)
        const input = parseAnalyzeInput(body)

        if (!input) {
          sendJson(response, 400, {
            error: 'Request body must include a string `text` or `html` field.',
          })
          return
        }

        const analysis =
          input.inputType === 'html'
            ? analyzeHtml(input.content)
            : analyzeText(input.content)

        sendJson(response, 200, {
          inputType: input.inputType,
          ...analysis,
        })
        return
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to process request'
        const statusCode = message === 'Request body too large' ? 413 : 400

        sendJson(response, statusCode, {
          error: message,
        })
        return
      }
    }

    sendJson(response, 404, {
      error: 'Not found',
    })
  })
}

export function startServer(port = DEFAULT_PORT) {
  const server = createApiServer()

  server.listen(port, () => {
    console.log(`gramadoc-api listening on port ${port}`)
  })

  return server
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number.parseInt(process.env.PORT ?? `${DEFAULT_PORT}`, 10)
  startServer(Number.isNaN(port) ? DEFAULT_PORT : port)
}
