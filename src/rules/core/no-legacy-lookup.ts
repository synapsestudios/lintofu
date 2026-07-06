import type { OpenTofuRuleDefinition } from '../../types.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'legacyLookup' }> = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Flag two-argument `lookup()`, deprecated since Terraform 0.7. Use index syntax instead.',
      recommended: true,
      severity: 'warn',
    },
    messages: {
      legacyLookup:
        'Two-argument `lookup()` is deprecated. Use index syntax, e.g. `var.tags["Name"]`.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      FunctionCallExpr(node) {
        if (node.name !== 'lookup') return;
        // The spread form `lookup(var.pair...)` has unknown runtime arity.
        if (node.expandFinal) return;
        // A third default argument keeps `lookup()` valid; only the two-arg
        // form is equivalent to native index syntax.
        if (node.args.length !== 2) return;
        const first = node.args[0];
        const second = node.args[1];
        if (first === undefined || second === undefined) return;
        context.report({
          node,
          messageId: 'legacyLookup',
          fix: (fixer) => {
            const firstText = sourceCode.getText(first);
            const secondText = sourceCode.getText(second);
            // The index postfix `[...]` binds tighter than conditional,
            // binary, and unary operators, so a first argument built from one
            // of those needs parentheses to keep its original meaning.
            const needsParens =
              first.type === 'ConditionalExpr' ||
              first.type === 'BinaryOpExpr' ||
              first.type === 'UnaryOpExpr';
            const base = needsParens ? `(${firstText})` : firstText;
            return fixer.replaceText(node, `${base}[${secondText}]`);
          },
        });
      },
    };
  },
};

export default rule;
