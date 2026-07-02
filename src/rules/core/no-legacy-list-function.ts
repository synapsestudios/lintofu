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
      category: 'core',
    },
    messages: {
      legacyListFunction:
        'The legacy `list(...)` function was deprecated in Terraform 0.12 and removed in 0.15. Use a `[...]` tuple literal instead.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      FunctionCallExpr(node) {
        if (node.name !== 'list') return;
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
