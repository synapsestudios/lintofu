import type { BinaryOp, Expression } from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute } from './utils.js';

const COUNT_BLOCK_KINDS = new Set(['resource', 'data', 'module']);

const BOOL_BINARY_OPS = new Set<BinaryOp>([
  'equal',
  'notEqual',
  'greaterThan',
  'greaterThanOrEqual',
  'lessThan',
  'lessThanOrEqual',
  'logicalAnd',
  'logicalOr',
]);

function unwrapParens(expr: Expression): Expression {
  return expr.type === 'ParenthesesExpr' ? unwrapParens(expr.expression) : expr;
}

function isProvableBool(expr: Expression): boolean {
  const inner = unwrapParens(expr);
  if (inner.type === 'LiteralValueExpr')
    return typeof inner.value === 'boolean';
  if (inner.type === 'UnaryOpExpr') return inner.op === 'logicalNot';
  if (inner.type === 'BinaryOpExpr') return BOOL_BINARY_OPS.has(inner.op);
  return false;
}

const rule: OpenTofuRuleDefinition<{ MessageIds: 'boolAsCount' }> = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Flag a `count` meta-argument set to a boolean; Terraform 0.12 removed bool-to-number coercion.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      boolAsCount:
        '`count` is set to a boolean value. Terraform 0.12 removed automatic bool-to-number coercion. Use a numeric conditional such as `count = var.enabled ? 1 : 0`.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (!COUNT_BLOCK_KINDS.has(node.kind)) return;
        const count = findAttribute(node.body.attributes, 'count');
        if (!count) return;
        const expr = count.expression;
        if (!isProvableBool(expr)) return;
        context.report({
          node: expr,
          messageId: 'boolAsCount',
          fix: (fixer) => {
            const inner = unwrapParens(expr);
            if (
              inner.type === 'LiteralValueExpr' &&
              typeof inner.value === 'boolean'
            ) {
              return fixer.replaceText(expr, inner.value ? '1' : '0');
            }
            const text = context.sourceCode.getText(inner);
            return fixer.replaceText(expr, `(${text}) ? 1 : 0`);
          },
        });
      },
    };
  },
};

export default rule;
