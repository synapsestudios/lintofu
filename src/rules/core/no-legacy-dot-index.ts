import type { SplatExpr, Traverser } from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'dotIndex' | 'dotSplat' }> = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Flag legacy dot forms `list.0` and `a.*.b`. Use bracket index `list[0]` and full splat `a[*].b`.',
      recommended: true,
      severity: 'warn',
    },
    messages: {
      dotIndex:
        'Legacy dot index `.{{index}}` is discouraged. Use bracket index `[{{index}}]`.',
      dotSplat: 'Legacy attribute splat `.*` is discouraged. Use `[*]`.',
    },
    schema: [],
  },
  create(context) {
    const source = context.sourceCode.getText();

    // A dot index and a bracket index parse to the same TraverseIndex node; the
    // only signal is the step's source text. `.0` is legacy, `[0]` is modern.
    const reportDotIndexSteps = (traversal: readonly Traverser[]): void => {
      for (const step of traversal) {
        if (step.type !== 'TraverseIndex') continue;
        const stepText = source.slice(
          step.range.start.offset,
          step.range.end.offset,
        );
        if (!stepText.trimStart().startsWith('.')) continue;
        context.report({
          node: step,
          messageId: 'dotIndex',
          data: { index: String(step.key) },
          fix: (fixer) =>
            fixer.replaceTextRange(
              [step.range.start.offset, step.range.end.offset],
              `[${String(step.key)}]`,
            ),
        });
      }
    };

    // Splat results indexed by a constant (`a.*.b[0]`) parse as a
    // RelativeTraversalExpr wrapping the SplatExpr. Rewriting `.*` to `[*]`
    // there changes meaning, so record those SplatExprs to skip their fix.
    // ESLint visits the wrapping RelativeTraversalExpr before its child
    // SplatExpr, so this set is populated before the SplatExpr handler reads it.
    const noFixSplats = new Set<SplatExpr>();

    return {
      ScopeTraversalExpr(node) {
        reportDotIndexSteps(node.traversal);
      },
      RelativeTraversalExpr(node) {
        reportDotIndexSteps(node.traversal);
        if (
          node.source.type === 'SplatExpr' &&
          node.traversal[0]?.type === 'TraverseIndex'
        ) {
          noFixSplats.add(node.source);
        }
      },
      SplatExpr(node) {
        // Read from the source end to the splat end so a bare `var.list.*`
        // (whose `each` sits at the `*`) is still recognized. A legacy splat
        // begins with `.*`; the modern `[*]` form starts with `[`.
        const marker = /^(\s*)\.\*/.exec(
          source.slice(node.source.range.end.offset, node.range.end.offset),
        );
        if (!marker) return;
        const dotStar = node.source.range.end.offset + (marker[1] ?? '').length;
        // A constant index that binds to each element (`a.*.b[0]`, `a.*.b.0`)
        // makes the `.*` to `[*]` rewrite meaning-changing, so report without a
        // fix; the wrapping-index case is caught via noFixSplats above.
        const eachIndexed =
          (node.each.type === 'ScopeTraversalExpr' ||
            node.each.type === 'RelativeTraversalExpr') &&
          node.each.traversal.some((s) => s.type === 'TraverseIndex');
        const safeToFix = !noFixSplats.has(node) && !eachIndexed;
        context.report({
          node,
          messageId: 'dotSplat',
          fix: safeToFix
            ? (fixer) => fixer.replaceTextRange([dotStar, dotStar + 2], '[*]')
            : undefined,
        });
      },
    };
  },
};

export default rule;
