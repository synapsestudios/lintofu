import type { OpenTofuRuleDefinition } from '../../types.js';
import { objectItemKeyName, requiredProviderEntries } from './utils.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'unpinnedProvider' }> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require every provider in `terraform.required_providers` to declare a `version` constraint.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      unpinnedProvider:
        'Provider `{{name}}` has no `version` constraint; pin it to avoid breaking changes on upgrade.',
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
          if (value.type !== 'ObjectConsExpr') continue;
          const hasVersion = value.items.some(
            (item) => objectItemKeyName(item) === 'version',
          );
          if (!hasVersion) {
            context.report({
              node: reportNode,
              messageId: 'unpinnedProvider',
              data: { name },
            });
          }
        }
      },
    };
  },
};

export default rule;
