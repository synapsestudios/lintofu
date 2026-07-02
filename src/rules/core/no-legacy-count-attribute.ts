import type { ScopeTraversalExpr } from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import { collectTraversals } from './utils.js';

const RESERVED_ROOTS = new Set([
  'var',
  'local',
  'module',
  'data',
  'each',
  'self',
  'path',
  'terraform',
  'count',
]);

// Matches `<type>.<name>.count`: a resource type root that is not a named
// scope, a resource name, then the removed `.count` attribute.
function legacyCountResource(expr: ScopeTraversalExpr): string | undefined {
  if (expr.traversal.length !== 3) return undefined;
  const [root, name, attr] = expr.traversal;
  if (root?.type !== 'TraverseRoot' || RESERVED_ROOTS.has(root.name)) {
    return undefined;
  }
  if (name?.type !== 'TraverseAttr') return undefined;
  if (attr?.type !== 'TraverseAttr' || attr.name !== 'count') return undefined;
  return `${root.name}.${name.name}`;
}

const rule: OpenTofuRuleDefinition<{ MessageIds: 'legacyCountAttribute' }> = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Flag references to the legacy `.count` attribute of a resource, removed in Terraform 0.12. Use `length(...)` instead.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      legacyCountAttribute:
        'The `.count` attribute of a resource was removed in Terraform 0.12. Use `length({{resource}})` instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      Attribute(node) {
        // collectTraversals tracks for-expression bindings, so a loop
        // variable like `r` in `[for r in aws_instance.foo : r.count]` is
        // never returned and cannot be mistaken for a resource reference.
        for (const traversal of collectTraversals(node.expression)) {
          const resource = legacyCountResource(traversal);
          if (resource === undefined) continue;
          context.report({
            node: traversal,
            messageId: 'legacyCountAttribute',
            data: { resource },
            fix: (fixer) => fixer.replaceText(traversal, `length(${resource})`),
          });
        }
      },
    };
  },
};

export default rule;
