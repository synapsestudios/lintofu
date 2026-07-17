import type { Block } from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute } from '../core/utils.js';

function isInlinePolicyBlock(block: Block): boolean {
  if (block.kind === 'inline_policy') return true;
  return block.kind === 'dynamic' && block.labels[0] === 'inline_policy';
}

const rule: OpenTofuRuleDefinition<{
  MessageIds: 'inlinePolicy' | 'managedPolicyArns';
}> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag deprecated inline `inline_policy` blocks and the `managed_policy_arns` argument on `aws_iam_role`; prefer standalone `aws_iam_role_policy` / `aws_iam_role_policy_attachment` resources.',
      recommended: true,
      severity: 'warn',
      category: 'aws',
    },
    messages: {
      inlinePolicy:
        'Inline `inline_policy` on `aws_iam_role` makes the role claim exclusive ownership of its inline policies and silently detaches any managed out of band. Use standalone `aws_iam_role_policy`, or `aws_iam_role_policies_exclusive` for intentional exclusive management.',
      managedPolicyArns:
        '`managed_policy_arns` on `aws_iam_role` makes the role claim exclusive ownership of its managed-policy attachments (an empty list detaches all of them). Use standalone `aws_iam_role_policy_attachment`, or `aws_iam_role_policy_attachments_exclusive` for intentional exclusive management.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        if (node.labels[0] !== 'aws_iam_role') return;

        for (const inner of node.body.blocks) {
          if (isInlinePolicyBlock(inner)) {
            context.report({ node: inner, messageId: 'inlinePolicy' });
          }
        }

        const managed = findAttribute(
          node.body.attributes,
          'managed_policy_arns',
        );
        if (managed) {
          context.report({ node: managed, messageId: 'managedPolicyArns' });
        }
      },
    };
  },
};

export default rule;
