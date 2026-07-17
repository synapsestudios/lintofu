import type { OpenTofuRuleDefinition } from '../../types.js';
import { blockLabel, findAttribute } from './utils.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'missingType' }> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require every `variable` block to declare a `type`.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      missingType: 'Variable `{{name}}` is missing a `type` attribute.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'variable') return;
        if (findAttribute(node.body.attributes, 'type')) return;
        context.report({
          node,
          messageId: 'missingType',
          data: { name: blockLabel(node) },
        });
      },
    };
  },
};

export default rule;
