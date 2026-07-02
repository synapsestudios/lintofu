import type { Expression } from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import { literalStringValue } from './utils.js';

const BARE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

interface Pair {
  key: string;
  value: Expression;
}

// Splits alternating key,value arguments into pairs. Returns undefined when the
// count is odd or any key is not a string literal, marking the call unsafe to
// rewrite automatically.
function pairArgs(args: readonly Expression[]): Pair[] | undefined {
  if (args.length % 2 !== 0) return undefined;
  const pairs: Pair[] = [];
  for (let i = 0; i < args.length; i += 2) {
    const keyExpr = args[i];
    const valueExpr = args[i + 1];
    if (!keyExpr || !valueExpr) return undefined;
    const key = literalStringValue(keyExpr);
    if (key === undefined) return undefined;
    pairs.push({ key, value: valueExpr });
  }
  return pairs;
}

const rule: OpenTofuRuleDefinition<{ MessageIds: 'legacyMapFunction' }> = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Flag the legacy `map(...)` function, removed in Terraform 0.15, in favor of a `{ key = value }` object literal.',
      recommended: true,
      severity: 'error',
      category: 'core',
    },
    messages: {
      legacyMapFunction:
        'The legacy `map(...)` function was removed in Terraform 0.15. Build the map with a `{ key = value }` object literal instead.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      FunctionCallExpr(node) {
        if (node.name !== 'map') return;
        const pairs = node.expandFinal ? undefined : pairArgs(node.args);
        if (!pairs) {
          context.report({ node, messageId: 'legacyMapFunction' });
          return;
        }
        const entries = pairs.map(({ key, value }) => {
          const label = BARE_IDENTIFIER.test(key) ? key : JSON.stringify(key);
          return `${label} = ${sourceCode.getText(value)}`;
        });
        const object =
          entries.length === 0 ? '{}' : `{ ${entries.join(', ')} }`;
        context.report({
          node,
          messageId: 'legacyMapFunction',
          fix: (fixer) => fixer.replaceText(node, object),
        });
      },
    };
  },
};

export default rule;
