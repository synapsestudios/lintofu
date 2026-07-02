import type { OpenTofuRuleDefinition } from '../../types.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'splatBracketIndex' }> = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag a constant index applied to a splat result, a pre-0.12 artifact; index the resource first instead.',
      recommended: true,
      severity: 'warn',
      category: 'core',
    },
    messages: {
      splatBracketIndex:
        'Indexing a splat result with a constant is a pre-0.12 artifact. Index the collection first, e.g. `aws_instance.example[0].id`.',
    },
    schema: [],
  },
  create(context) {
    return {
      // A constant index on a splat parses as a RelativeTraversalExpr whose
      // source is the SplatExpr and whose first step is a TraverseIndex; a
      // non-constant index lands in an IndexExpr instead and is left alone.
      RelativeTraversalExpr(node) {
        if (node.source.type !== 'SplatExpr') return;
        if (node.traversal[0]?.type !== 'TraverseIndex') return;
        context.report({ node, messageId: 'splatBracketIndex' });
      },
    };
  },
};

export default rule;
