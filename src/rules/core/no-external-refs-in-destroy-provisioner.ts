import type {
  Attribute,
  Expression,
  ScopeTraversalExpr,
} from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import { collectTraversals, findAttribute, traversalText } from '../utils.js';

function isDestroyBareword(expr: Expression): boolean {
  return (
    expr.type === 'ScopeTraversalExpr' &&
    expr.traversal.length === 1 &&
    expr.traversal[0]?.type === 'TraverseRoot' &&
    expr.traversal[0].name === 'destroy'
  );
}

function isAllowedTraversal(expr: ScopeTraversalExpr): boolean {
  const [head, second] = expr.traversal;
  if (head?.type !== 'TraverseRoot') return false;
  if (head.name === 'self') return true;
  if (head.name === 'count') {
    return (
      expr.traversal.length === 2 &&
      second?.type === 'TraverseAttr' &&
      second.name === 'index'
    );
  }
  if (head.name === 'each') {
    return (
      expr.traversal.length === 2 &&
      second?.type === 'TraverseAttr' &&
      (second.name === 'key' || second.name === 'value')
    );
  }
  return false;
}

const rule: OpenTofuRuleDefinition<{ MessageIds: 'disallowedReference' }> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag references to anything other than `self`, `count.index`, or `each.key`/`each.value` inside `provisioner` blocks with `when = destroy`.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      disallowedReference:
        'Destroy-time provisioners may only reference `self`, `count.index`, `each.key`, or `each.value`. `{{name}}` is not allowed.',
    },
    schema: [],
  },
  create(context) {
    function checkAttributes(attrs: readonly Attribute[]): void {
      for (const attr of attrs) {
        if (attr.name === 'when') continue;
        const traversals = collectTraversals(attr.expression);
        for (const t of traversals) {
          if (!isAllowedTraversal(t)) {
            context.report({
              node: t,
              messageId: 'disallowedReference',
              data: { name: traversalText(t) },
            });
          }
        }
      }
    }

    return {
      Block(node) {
        if (node.kind !== 'provisioner') return;
        const whenAttr = findAttribute(node.body.attributes, 'when');
        if (!whenAttr || !isDestroyBareword(whenAttr.expression)) return;
        checkAttributes(node.body.attributes);
        for (const inner of node.body.blocks) {
          if (inner.kind === 'connection') {
            checkAttributes(inner.body.attributes);
          }
        }
      },
    };
  },
};

export default rule;
