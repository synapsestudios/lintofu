import type { OpenTofuRuleDefinition } from '../../types.js';
import { blockLabel } from './utils.js';

// Reserved by OpenTofu because they collide with module meta-arguments; a
// `variable` block may not use any of them as its name.
const RESERVED_VARIABLE_NAMES = new Set([
  'source',
  'version',
  'providers',
  'count',
  'for_each',
  'lifecycle',
  'depends_on',
  'locals',
]);

const rule: OpenTofuRuleDefinition<{ MessageIds: 'reservedName' }> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow `variable` blocks named after an OpenTofu reserved meta-argument.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      reservedName:
        'Variable name `{{name}}` is reserved by OpenTofu and cannot be used.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'variable') return;
        const name = blockLabel(node);
        if (RESERVED_VARIABLE_NAMES.has(name)) {
          context.report({ node, messageId: 'reservedName', data: { name } });
        }
      },
    };
  },
};

export default rule;
