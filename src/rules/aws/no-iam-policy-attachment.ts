import type { OpenTofuRuleDefinition } from '../../types.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'iamPolicyAttachment' }> = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Flag `aws_iam_policy_attachment`, which manages a managed policy's attachments exclusively account-wide; prefer the non-exclusive per-principal attachment resources or the `*_policy_attachments_exclusive` resources.",
      recommended: true,
      severity: 'warn',
      category: 'aws',
    },
    messages: {
      iamPolicyAttachment:
        "`aws_iam_policy_attachment` manages a policy's attachments exclusively across the whole AWS account and detaches any principal it does not list. Prefer the non-exclusive `aws_iam_role_policy_attachment` / `aws_iam_user_policy_attachment` / `aws_iam_group_policy_attachment`; when exclusive management is intended, use `aws_iam_role_policy_attachments_exclusive` (or the `_user_` / `_group_` counterparts) to scope exclusivity per principal. See https://api.opentofu.org/registry/docs/providers/opentofu/aws/v6.42.0/resources/iam_policy_attachment.md",
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        if (node.labels[0] !== 'aws_iam_policy_attachment') return;
        context.report({ node, messageId: 'iamPolicyAttachment' });
      },
    };
  },
};

export default rule;
