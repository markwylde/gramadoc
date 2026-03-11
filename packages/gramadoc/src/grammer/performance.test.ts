import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { analyzeHtml, analyzeText, buildRuleCheckContext } from './utils'

const benchmarkText = `
The colour palette helped us organise the centre display, but Github Actions still ran Typescript checks on ipv6 traffic from G Suite.
Please be advised that the rollout moved at your earliest convenience, and each and every reviewer should make use of the checklist prior to launch.
Your should check weather the config changed, and there fore we should update it before the release was shipped yesterday.
We met in order to discuss the API guide, the application programming interface notes, and the website copy for the command line interface.
`.trim()

const benchmarkHtml = `
<article>
  <p>${benchmarkText}</p>
  <blockquote>  This block quote keeps leading whitespace that should stay quiet if the parser treats it as quoted content.  </blockquote>
  <ul>
    <li>Github Actions</li>
    <li>basic fundamentals</li>
    <li>colour and color</li>
  </ul>
</article>
`.trim()

function measureAverageDuration(action: () => void, iterations: number) {
  for (let index = 0; index < 5; index += 1) {
    action()
  }

  const startedAt = performance.now()

  for (let index = 0; index < iterations; index += 1) {
    action()
  }

  return (performance.now() - startedAt) / iterations
}

describe('performance guards', () => {
  it('keeps repeated text analysis comfortably below the lexical-pack regression threshold', () => {
    const averageDurationMs = measureAverageDuration(
      () => analyzeText(benchmarkText, { languageCode: 'en-US' }),
      25,
    )

    expect(averageDurationMs).toBeLessThan(50)
  })

  it('keeps html analysis within a similar budget for mixed block content', () => {
    const averageDurationMs = measureAverageDuration(
      () => analyzeHtml(benchmarkHtml, { languageCode: 'en-US' }),
      20,
    )

    expect(averageDurationMs).toBeLessThan(70)
  })

  it('builds tokenized rule contexts without super-linear slowdowns on repeated runs', () => {
    const averageDurationMs = measureAverageDuration(
      () => buildRuleCheckContext(benchmarkText, { languageCode: 'en-US' }),
      40,
    )

    expect(averageDurationMs).toBeLessThan(30)
  })
})
