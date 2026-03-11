import type { GrammerRule } from '../types.js'
import { buildRuleCheckContext } from '../utils.js'

export function runRule(
  rule: GrammerRule,
  text: string,
  options?: Parameters<typeof buildRuleCheckContext>[1],
) {
  return rule.check(buildRuleCheckContext(text, options))
}
