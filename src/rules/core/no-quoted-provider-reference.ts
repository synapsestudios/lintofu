import type { Expression, ObjectConsExpr } from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute, literalStringValue } from './utils.js';

// A bare provider reference is `aws` or `aws.west`: an identifier, optionally
// followed by dotted attribute steps. A providers-map key takes the same shape,
// since a bare qualified key such as `aws.alt` is legal. Each step starts with a
// distinct char after `.`, so there is no backtracking ambiguity.
const REFERENCE =
  // eslint-disable-next-line security/detect-unsafe-regex
  /^[A-Za-z_][A-Za-z0-9_-]*(\.[A-Za-z_][A-Za-z0-9_-]*)*$/;

const rule: OpenTofuRuleDefinition<{ MessageIds: 'quotedProviderReference' }> =
  {
    meta: {
      type: 'suggestion',
      fixable: 'code',
      docs: {
        description:
          'Disallow quoted provider references in `provider` arguments and module `providers` maps; use a bare traversal.',
        recommended: true,
        severity: 'warn',
      },
      messages: {
        quotedProviderReference:
          'Quoted provider reference is deprecated. Use a bare traversal, e.g. `aws.west`.',
      },
      schema: [],
    },
    create(context) {
      // `target` is the node to report and replace (it spans the quotes); `read`
      // is the expression to pull the literal string from. For a quoted map key
      // the two differ: the key arrives as an ObjectConsKeyExpr wrapping the
      // literal TemplateExpr, and the wrapper's span includes the quotes.
      function reportQuoted(
        target: Expression,
        read: Expression,
        pattern: RegExp,
      ): void {
        const value = literalStringValue(read);
        if (value === undefined) return;
        context.report({
          node: target,
          messageId: 'quotedProviderReference',
          fix: pattern.test(value)
            ? (fixer) => fixer.replaceText(target, value)
            : undefined,
        });
      }

      return {
        Block(node) {
          // resource, data, and import blocks all take a `provider` argument.
          if (
            node.kind === 'resource' ||
            node.kind === 'data' ||
            node.kind === 'import'
          ) {
            const attr = findAttribute(node.body.attributes, 'provider');
            if (attr) reportQuoted(attr.expression, attr.expression, REFERENCE);
            return;
          }
          if (node.kind === 'module') {
            const attr = findAttribute(node.body.attributes, 'providers');
            if (attr?.expression.type !== 'ObjectConsExpr') return;
            const object: ObjectConsExpr = attr.expression;
            for (const item of object.items) {
              const keyInner =
                item.keyExpr.type === 'ObjectConsKeyExpr'
                  ? item.keyExpr.wrapped
                  : item.keyExpr;
              reportQuoted(item.keyExpr, keyInner, REFERENCE);
              reportQuoted(item.valueExpr, item.valueExpr, REFERENCE);
            }
          }
        },
      };
    },
  };

export default rule;
