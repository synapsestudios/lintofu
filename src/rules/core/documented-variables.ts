import type { OpenTofuRuleDefinition } from '../../types.js';
import { blockLabel, checkDescription } from './utils.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'missingDescription' }> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require every `variable` block to have a `description`.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      missingDescription:
        'Variable `{{name}}` is missing a `description` attribute.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'variable') return;
        const label = blockLabel(node);
        const check = checkDescription(node);
        if (check.status === 'missing') {
          context.report({
            node,
            messageId: 'missingDescription',
            data: { name: label },
          });
        } else if (check.status === 'empty') {
          context.report({
            node: check.attr,
            messageId: 'missingDescription',
            data: { name: label },
          });
        }
      },
    };
  },
};

export default rule;
