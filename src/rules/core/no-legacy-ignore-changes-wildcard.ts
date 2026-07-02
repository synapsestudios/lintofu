import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute, literalStringValue } from './utils.js';

const rule: OpenTofuRuleDefinition<{
  MessageIds: 'legacyIgnoreChangesWildcard';
}> = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Flag the quoted `["*"]` wildcard in a `lifecycle` `ignore_changes` list, replaced by the unquoted `all` keyword in Terraform 0.15.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      legacyIgnoreChangesWildcard:
        'The quoted `"*"` wildcard in `ignore_changes` was removed in Terraform 0.15. Use the unquoted `all` keyword instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'lifecycle') return;
        const attr = findAttribute(node.body.attributes, 'ignore_changes');
        if (!attr) return;
        const expr = attr.expression;
        if (expr.type !== 'TupleConsExpr' || expr.exprs.length !== 1) return;
        const only = expr.exprs[0];
        if (only === undefined || literalStringValue(only) !== '*') return;
        context.report({
          node: expr,
          messageId: 'legacyIgnoreChangesWildcard',
          fix: (fixer) => fixer.replaceText(expr, 'all'),
        });
      },
    };
  },
};

export default rule;
