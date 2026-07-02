import type { OpenTofuRuleDefinition } from '../../types.js';
import { traversalHead } from './utils.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'terraformEnvReference' }> = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Flag references to `terraform.env`, replaced by `terraform.workspace` since Terraform 0.10.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      terraformEnvReference:
        '`terraform.env` was replaced by `terraform.workspace` in Terraform 0.10. Use `terraform.workspace` instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      ScopeTraversalExpr(node) {
        const head = traversalHead(node);
        if (head?.[0] !== 'terraform' || head[1] !== 'env') return;
        context.report({
          node,
          messageId: 'terraformEnvReference',
          fix: (fixer) => fixer.replaceText(node, 'terraform.workspace'),
        });
      },
    };
  },
};

export default rule;
