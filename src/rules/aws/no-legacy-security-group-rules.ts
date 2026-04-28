import type { OpenTofuRuleDefinition } from '../../types.js';

const rule: OpenTofuRuleDefinition<{
  MessageIds: 'legacySecurityGroupRule';
}> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag legacy `aws_security_group_rule` resources and inline `ingress`/`egress` blocks; prefer `aws_vpc_security_group_{ingress,egress}_rule`.',
      recommended: true,
      severity: 'error',
      category: 'aws',
    },
    messages: {
      legacySecurityGroupRule:
        'Use `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` instead. The legacy form is deprecated by the provider; see https://api.opentofu.org/registry/docs/providers/opentofu/aws/v6.42.0/resources/security_group_rule.md',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        if (node.labels[0] === 'aws_security_group_rule') {
          context.report({ node, messageId: 'legacySecurityGroupRule' });
          return;
        }
        if (node.labels[0] === 'aws_security_group') {
          for (const inner of node.body.blocks) {
            if (inner.kind === 'ingress' || inner.kind === 'egress') {
              context.report({
                node: inner,
                messageId: 'legacySecurityGroupRule',
              });
            }
          }
        }
      },
    };
  },
};

export default rule;
