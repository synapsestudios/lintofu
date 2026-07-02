import type { OpenTofuRuleDefinition } from '../../types.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'legacyListFunction' }> = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Flag the legacy `list(...)` function, removed in Terraform 0.15. Use a `[...]` tuple literal instead.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      legacyListFunction:
        'The legacy `list(...)` function was deprecated in Terraform 0.12 and removed in 0.15. Use a `[...]` tuple literal instead.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    // `type = list(string)` in a variable block is a current type constraint,
    // not the legacy value function, but it parses as a FunctionCallExpr named
    // `list`. Record each variable block's `type` expression range so the
    // FunctionCallExpr handler can skip calls that fall within it. ESLint
    // visits a Block before its descendant expressions, so these ranges are
    // populated before any nested `list(...)` call is checked.
    const typeConstraintRanges: { start: number; end: number }[] = [];
    return {
      Block(node) {
        if (node.kind !== 'variable') return;
        const typeAttr = node.body.attributes.find((a) => a.name === 'type');
        if (typeAttr) {
          typeConstraintRanges.push({
            start: typeAttr.expression.range.start.offset,
            end: typeAttr.expression.range.end.offset,
          });
        }
      },
      FunctionCallExpr(node) {
        if (node.name !== 'list') return;
        const withinTypeConstraint = typeConstraintRanges.some(
          (r) =>
            node.range.start.offset >= r.start &&
            node.range.end.offset <= r.end,
        );
        if (withinTypeConstraint) return;
        context.report({
          node,
          messageId: 'legacyListFunction',
          // Splice the original argument source (comma-separated, from the
          // first arg's start to the last arg's end) into a bracket tuple.
          // A `...` spread cannot become a tuple literal, so skip the fix.
          fix: node.expandFinal
            ? undefined
            : (fixer) => {
                const first = node.args[0];
                const last = node.args[node.args.length - 1];
                const inner =
                  first && last
                    ? sourceCode
                        .getText()
                        .slice(first.range.start.offset, last.range.end.offset)
                    : '';
                return fixer.replaceText(node, `[${inner}]`);
              },
        });
      },
    };
  },
};

export default rule;
