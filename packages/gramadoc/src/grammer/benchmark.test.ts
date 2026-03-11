import { describe, expect, it } from 'vitest'
import { analyzeText } from './utils'

const benchmarkText = `
The colour palette helped us organise the centre display, but Github Actions still ran Typescript checks on ipv6 traffic from G Suite.
Please be advised that the rollout moved at your earliest convenience, and each and every reviewer should make use of the checklist prior to launch.
Your should check weather the config changed, and there fore we should update it before the release was shipped yesterday.
`.trim()

describe('benchmark guard', () => {
  it('keeps a representative lexical-pack-heavy analysis run under a generous average budget', () => {
    for (let index = 0; index < 5; index += 1) {
      analyzeText(benchmarkText, { languageCode: 'en-US' })
    }

    const startedAt = performance.now()

    for (let index = 0; index < 20; index += 1) {
      analyzeText(benchmarkText, { languageCode: 'en-US' })
    }

    const averageDurationMs = (performance.now() - startedAt) / 20
    expect(averageDurationMs).toBeLessThan(50)
  })
})
