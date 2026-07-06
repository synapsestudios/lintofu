import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute, literalStringValue } from './utils.js';

// A valid attribute path can be unquoted safely: a bare identifier followed by
// any number of `.attr`, `[0]`, or `["key"]` steps. Anything else (an
// interpolation, a `*` wildcard, whitespace) is left quoted. Each group
// iteration starts with a fixed `.` or `[`, and the two `[` branches diverge on
// their next character, so the outer `*` cannot match the same input two ways.
const ATTRIBUTE_PATH =
  // eslint-disable-next-line security/detect-unsafe-regex
  /^[A-Za-z_][A-Za-z0-9_-]*(\.[A-Za-z_][A-Za-z0-9_-]*|\[[0-9]+\]|\["[^"\\]*"\])*$/;

const rule: OpenTofuRuleDefinition<{ MessageIds: 'quotedIgnoreChanges' }> = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Disallow quoted references in a `lifecycle` `ignore_changes` list; use bare attribute references.',
      recommended: true,
      severity: 'warn',
    },
    messages: {
      quotedIgnoreChanges:
        'Quoted reference in `ignore_changes` is deprecated. Use a bare attribute reference, e.g. `[ami, tags]`.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'lifecycle') return;
        const attr = findAttribute(node.body.attributes, 'ignore_changes');
        if (!attr) return;
        const expr = attr.expression;
        if (expr.type !== 'TupleConsExpr') return;

        // The single-element `["*"]` form belongs to
        // no-legacy-ignore-changes-wildcard.
        const only = expr.exprs[0];
        if (
          expr.exprs.length === 1 &&
          only !== undefined &&
          literalStringValue(only) === '*'
        ) {
          return;
        }

        for (const el of expr.exprs) {
          // literalStringValue returns a string only for an all-literal
          // TemplateExpr, so bare references, interpolated elements, and the
          // `"${ref}"` form all fall through untouched.
          const value = literalStringValue(el);
          if (value === undefined) continue;
          context.report({
            node: el,
            messageId: 'quotedIgnoreChanges',
            fix: ATTRIBUTE_PATH.test(value)
              ? (fixer) => fixer.replaceText(el, value)
              : undefined,
          });
        }
      },
    };
  },
};

export default rule;
