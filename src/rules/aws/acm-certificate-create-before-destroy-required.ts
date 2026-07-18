import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute } from '../core/utils.js';

const rule: OpenTofuRuleDefinition<{
  MessageIds: 'missingCreateBeforeDestroy';
}> = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require `lifecycle { create_before_destroy = true }` on `aws_acm_certificate` so replacing an in-use certificate does not hang until timeout.',
      recommended: true,
      severity: 'warn',
      category: 'aws',
    },
    messages: {
      missingCreateBeforeDestroy:
        'Replacing an in-use `aws_acm_certificate` under the default destroy-before-create ordering hangs until timeout because ACM refuses to delete a certificate still attached to a resource. Set `lifecycle { create_before_destroy = true }`.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        if (node.labels[0] !== 'aws_acm_certificate') return;

        const lifecycle = node.body.blocks.find((b) => b.kind === 'lifecycle');

        if (lifecycle) {
          const preventDestroy = findAttribute(
            lifecycle.body.attributes,
            'prevent_destroy',
          );
          if (
            preventDestroy?.expression.type === 'LiteralValueExpr' &&
            preventDestroy.expression.value === true
          ) {
            return;
          }
        }

        if (!lifecycle) {
          context.report({ node, messageId: 'missingCreateBeforeDestroy' });
          return;
        }

        const cbd = findAttribute(
          lifecycle.body.attributes,
          'create_before_destroy',
        );
        if (!cbd) {
          context.report({ node, messageId: 'missingCreateBeforeDestroy' });
          return;
        }
        if (
          cbd.expression.type === 'LiteralValueExpr' &&
          cbd.expression.value === false
        ) {
          context.report({ node, messageId: 'missingCreateBeforeDestroy' });
        }
      },
    };
  },
};

export default rule;
