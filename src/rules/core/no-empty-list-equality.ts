import type { OpenTofuRuleDefinition } from '../../types.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'emptyListEquality' }> = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Flag `==` or `!=` against an empty tuple literal `[]`, which never matches a list, set, or map value. Use `length(expr) == 0` instead.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      emptyListEquality:
        'Comparing with an empty tuple `[]` never matches a list, set, or map value. Compare `length(expr)` to `0` instead.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      // `[]` parses as a TupleConsExpr with no elements, and `==` is true only
      // when both operands share a type, so a list/set/map value never equals
      // `[]`. Only `==`/`!=` against such a literal is a mistake.
      BinaryOpExpr(node) {
        if (node.op !== 'equal' && node.op !== 'notEqual') return;
        const lhsEmpty =
          node.lhs.type === 'TupleConsExpr' && node.lhs.exprs.length === 0;
        const rhsEmpty =
          node.rhs.type === 'TupleConsExpr' && node.rhs.exprs.length === 0;
        if (!lhsEmpty && !rhsEmpty) return;
        context.report({
          node,
          messageId: 'emptyListEquality',
          // With one empty-tuple operand, rewrite to `length(other) == 0`.
          // When both sides are `[]` there is no expression to measure, so
          // leave the comparison alone and only report.
          fix:
            lhsEmpty && rhsEmpty
              ? undefined
              : (fixer) => {
                  const other = lhsEmpty ? node.rhs : node.lhs;
                  const otherText = sourceCode.getText(other);
                  const op = node.op === 'equal' ? '==' : '!=';
                  return fixer.replaceText(
                    node,
                    `length(${otherText}) ${op} 0`,
                  );
                },
        });
      },
    };
  },
};

export default rule;
