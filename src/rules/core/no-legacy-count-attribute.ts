import type { OpenTofuRuleDefinition } from '../../types.js';

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
      ScopeTraversalExpr(node) {
        if (node.traversal.length !== 3) return;
        const [root, name, attr] = node.traversal;
        if (root?.type !== 'TraverseRoot' || RESERVED_ROOTS.has(root.name)) {
          return;
        }
        if (name?.type !== 'TraverseAttr') return;
        if (attr?.type !== 'TraverseAttr' || attr.name !== 'count') return;
        const resource = `${root.name}.${name.name}`;
        context.report({
          node,
          messageId: 'legacyCountAttribute',
          data: { resource },
          fix: (fixer) => fixer.replaceText(node, `length(${resource})`),
        });
      },
    };
  },
};

export default rule;
