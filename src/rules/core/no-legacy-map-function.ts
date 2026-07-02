import type { Expression } from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import { literalStringValue } from './utils.js';

const BARE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

interface Pair {
  key: string;
  value: Expression;
}

// Splits alternating key,value arguments into pairs. Returns undefined when the
// count is odd, any key is not a string literal, or two keys collide, marking
// the call unsafe to rewrite automatically. Legacy `map` let a later duplicate
// key win, but a `{ a = 1, a = 2 }` object literal is a parse error, so the fix
// falls back to report-only when literal keys repeat.
function pairArgs(args: readonly Expression[]): Pair[] | undefined {
  if (args.length % 2 !== 0) return undefined;
  const pairs: Pair[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i += 2) {
    const keyExpr = args[i];
    const valueExpr = args[i + 1];
    if (!keyExpr || !valueExpr) return undefined;
    const key = literalStringValue(keyExpr);
    if (key === undefined) return undefined;
    if (seen.has(key)) return undefined;
    seen.add(key);
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
    },
    messages: {
      legacyMapFunction:
        'The legacy `map(...)` function was removed in Terraform 0.15. Build the map with a `{ key = value }` object literal instead.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    // Byte ranges of variable `type` attribute expressions. `map(string)` there
    // is a type constraint, not the legacy function, so any call inside one of
    // these ranges is skipped. Block visitors run before their descendants, so
    // the ranges are recorded before the inner call is visited.
    const typeConstraintRanges: [number, number][] = [];
    return {
      Block(node) {
        if (node.kind !== 'variable') return;
        for (const attr of node.body.attributes) {
          if (attr.name !== 'type') continue;
          typeConstraintRanges.push([
            attr.expression.range.start.offset,
            attr.expression.range.end.offset,
          ]);
        }
      },
      FunctionCallExpr(node) {
        if (node.name !== 'map') return;
        const start = node.range.start.offset;
        const end = node.range.end.offset;
        const inTypeConstraint = typeConstraintRanges.some(
          ([from, to]) => start >= from && end <= to,
        );
        if (inTypeConstraint) return;
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
