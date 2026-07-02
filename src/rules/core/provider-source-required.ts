import type { OpenTofuRuleDefinition } from '../../types.js';
import { objectItemKeyName, requiredProviderEntries } from './utils.js';

const rule: OpenTofuRuleDefinition<{
  MessageIds: 'missingSource' | 'legacyStringForm';
}> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require every provider in `terraform.required_providers` to declare an explicit `source`.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      missingSource:
        'Provider `{{name}}` has no `source`; add `source = "namespace/name"` so the provider resolves explicitly.',
      legacyStringForm:
        'Provider `{{name}}` uses the legacy version-string form; rewrite it as `{ source = "namespace/name", version = "..." }`.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'terraform') return;
        for (const { name, value, node: reportNode } of requiredProviderEntries(
          node,
        )) {
          if (value.type === 'ObjectConsExpr') {
            const hasSource = value.items.some(
              (item) => objectItemKeyName(item) === 'source',
            );
            if (!hasSource) {
              context.report({
                node: reportNode,
                messageId: 'missingSource',
                data: { name },
              });
            }
          } else if (value.type === 'TemplateExpr') {
            context.report({
              node: reportNode,
              messageId: 'legacyStringForm',
              data: { name },
            });
          }
        }
      },
    };
  },
};

export default rule;
