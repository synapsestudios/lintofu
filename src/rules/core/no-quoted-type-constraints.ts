import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute, literalStringValue } from './utils.js';

// The legacy `"list"`, `"map"`, and `"set"` forms meant a collection of
// strings, so their unquoted keyword takes an explicit `string` element type.
// `"object"` and `"tuple"` have no bare keyword form (they require a type
// argument), so they are flagged without a fix.
const REPLACEMENTS: Record<string, string> = {
  string: 'string',
  number: 'number',
  bool: 'bool',
  any: 'any',
  list: 'list(string)',
  map: 'map(string)',
  set: 'set(string)',
};

const FLAGGED = new Set([...Object.keys(REPLACEMENTS), 'object', 'tuple']);

const rule: OpenTofuRuleDefinition<{ MessageIds: 'quotedTypeConstraint' }> = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Disallow quoted type constraints in `variable` blocks; use the unquoted type keyword.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      quotedTypeConstraint:
        'Quoted type constraint `"{{name}}"` is not allowed as of Terraform 0.15. Use the unquoted type keyword instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'variable') return;
        const attr = findAttribute(node.body.attributes, 'type');
        if (!attr) return;
        const value = literalStringValue(attr.expression);
        if (value === undefined || !FLAGGED.has(value)) return;
        const replacement = REPLACEMENTS[value];
        context.report({
          node: attr.expression,
          messageId: 'quotedTypeConstraint',
          data: { name: value },
          fix: replacement
            ? (fixer) => fixer.replaceText(attr.expression, replacement)
            : undefined,
        });
      },
    };
  },
};

export default rule;
