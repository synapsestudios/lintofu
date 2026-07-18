import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute } from './utils.js';

const rule: OpenTofuRuleDefinition<{
  MessageIds: 'providerVersionConstraint';
}> = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag a `version` argument inside a `provider` block; declare the version in `terraform.required_providers` instead.',
      recommended: true,
      severity: 'warn',
    },
    messages: {
      providerVersionConstraint:
        'The `version` argument inside `provider "{{provider}}"` is deprecated and only takes effect when `terraform.required_providers` omits a constraint for this provider. Declare the version in `required_providers` instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'provider') return;
        const versionAttr = findAttribute(node.body.attributes, 'version');
        if (!versionAttr) return;
        context.report({
          node: versionAttr,
          messageId: 'providerVersionConstraint',
          data: { provider: node.labels[0] ?? '<unnamed>' },
        });
      },
    };
  },
};

export default rule;
