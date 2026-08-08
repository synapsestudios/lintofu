import { resolveRuleSeverity, type RuleWithDocs } from '../rules/types.js';

export function buildRecommendedRules(
  rules: Record<string, RuleWithDocs>,
): Record<string, 'error' | 'warn'> {
  const out: Record<string, 'error' | 'warn'> = {};
  for (const [name, rule] of Object.entries(rules)) {
    const docs = rule.meta?.docs;
    if (docs?.recommended === true) {
      out[`lintofu/${name}`] = resolveRuleSeverity(docs);
    }
  }
  return out;
}
