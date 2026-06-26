import type {
  Attribute,
  Expression,
  ScopeTraversalExpr,
} from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute } from '../utils.js';

function isDestroyBareword(expr: Expression): boolean {
  return (
    expr.type === 'ScopeTraversalExpr' &&
    expr.traversal.length === 1 &&
    expr.traversal[0]?.type === 'TraverseRoot' &&
    expr.traversal[0].name === 'destroy'
  );
}

function collectTraversals(expr: Expression, out: ScopeTraversalExpr[]): void {
  switch (expr.type) {
    case 'ScopeTraversalExpr':
      out.push(expr);
      return;
    case 'TemplateExpr':
      for (const part of expr.parts) collectTraversals(part, out);
      return;
    case 'TemplateWrapExpr':
      collectTraversals(expr.wrapped, out);
      return;
    case 'FunctionCallExpr':
      for (const arg of expr.args) collectTraversals(arg, out);
      return;
    case 'ObjectConsExpr':
      for (const item of expr.items) {
        // Bareword keys (`FOO = ...`) wrap a single-step ScopeTraversalExpr
        // in ObjectConsKeyExpr; that's a name, not a reference. Quoted /
        // interpolated keys arrive as TemplateExpr and may contain real refs.
        if (item.keyExpr.type !== 'ObjectConsKeyExpr') {
          collectTraversals(item.keyExpr, out);
        }
        collectTraversals(item.valueExpr, out);
      }
      return;
    default:
      return;
  }
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

function traversalText(expr: ScopeTraversalExpr): string {
  return expr.traversal.map((t) => t.name).join('.');
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
        const traversals: ScopeTraversalExpr[] = [];
        collectTraversals(attr.expression, traversals);
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
