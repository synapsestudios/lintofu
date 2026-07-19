import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute } from '../core/utils.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'resolveConflicts' }> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag the `resolve_conflicts` argument on `aws_eks_addon`, removed in AWS provider v6. Use `resolve_conflicts_on_create` and `resolve_conflicts_on_update`.',
      recommended: true,
      severity: 'error',
      category: 'aws',
      appliesTo: { aws: '>=6.0.0' },
    },
    messages: {
      resolveConflicts:
        'The `resolve_conflicts` argument on `aws_eks_addon` was removed in AWS provider v6. Replace it with `resolve_conflicts_on_create` and `resolve_conflicts_on_update`.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        if (node.labels[0] !== 'aws_eks_addon') return;
        const attr = findAttribute(node.body.attributes, 'resolve_conflicts');
        if (!attr) return;
        context.report({
          node: attr,
          messageId: 'resolveConflicts',
        });
      },
    };
  },
};

export default rule;
