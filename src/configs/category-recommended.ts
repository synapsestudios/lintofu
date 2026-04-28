import type { LintofuRuleDocs } from '../rules/types.js';

interface RuleWithDocs {
  meta?: { docs?: LintofuRuleDocs };
}

export function buildCategoryRecommendedRules(
  rules: Record<string, RuleWithDocs>,
  category: string,
): Record<string, 'error' | 'warn'> {
  const out: Record<string, 'error' | 'warn'> = {};
  for (const [name, rule] of Object.entries(rules)) {
    const docs = rule.meta?.docs;
    if (docs?.recommended === true && docs.category === category) {
      out[`lintofu/${name}`] = docs.severity ?? 'error';
    }
  }
  return out;
}
