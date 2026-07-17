import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute, literalStringValue } from './utils.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'winrmConnection' }> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag `connection` blocks with `type = "winrm"`; winrm is deprecated in OpenTofu 1.12 and slated for removal in 1.13. Use `type = "ssh"`.',
      recommended: true,
      severity: 'warn',
    },
    messages: {
      winrmConnection:
        'The `winrm` connection type is deprecated in OpenTofu 1.12 and will be removed in 1.13. Use `type = "ssh"` instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'connection') return;
        const typeAttr = findAttribute(node.body.attributes, 'type');
        if (!typeAttr) return;
        if (literalStringValue(typeAttr.expression) !== 'winrm') return;
        context.report({ node: typeAttr, messageId: 'winrmConnection' });
      },
    };
  },
};

export default rule;
