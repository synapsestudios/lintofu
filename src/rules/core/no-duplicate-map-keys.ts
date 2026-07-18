import type { OpenTofuRuleDefinition } from '../../types.js';
import { objectItemKeyName } from './utils.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'duplicateMapKey' }> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag a repeated statically-known key in an object literal. HCL keeps only the last entry and silently discards the earlier ones.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      duplicateMapKey:
        'Duplicate object key `{{key}}`. HCL keeps only the last entry and silently discards the earlier ones, which can drop settings such as an IAM policy condition.',
    },
    schema: [],
  },
  create(context) {
    return {
      // Each object literal is its own scope. Statically-known keys are literal
      // strings, bare identifiers, and single-part templates; computed keys
      // (traversals, calls, interpolations, conditionals) yield undefined and
      // are skipped, since their collision cannot be proven at lint time.
      ObjectConsExpr(node) {
        const seen = new Set<string>();
        for (const item of node.items) {
          const name = objectItemKeyName(item);
          if (name === undefined) continue;
          if (seen.has(name)) {
            context.report({
              node: item.keyExpr,
              messageId: 'duplicateMapKey',
              data: { key: name },
            });
            continue;
          }
          seen.add(name);
        }
      },
    };
  },
};

export default rule;
