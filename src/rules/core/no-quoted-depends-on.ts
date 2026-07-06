import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute, literalStringValue } from './utils.js';

// depends_on is a meta-argument only on these block kinds; elsewhere an
// attribute named depends_on is a plain value that must not be rewritten.
const KINDS = new Set(['resource', 'data', 'module', 'output']);

// A single resource/module address: a root identifier followed by attribute
// steps, numeric indexes, or quoted-key indexes. Anything else (a literal with
// spaces, an operator, etc.) is not a bare reference and gets no fix. Each group
// iteration starts with a fixed `.` or `[`, and the two `[` branches diverge on
// their next character, so the outer `*` cannot match the same input two ways.
const REFERENCE =
  // eslint-disable-next-line security/detect-unsafe-regex
  /^[A-Za-z_][A-Za-z0-9_-]*(\.[A-Za-z_][A-Za-z0-9_-]*|\[[0-9]+\]|\["[^"\\]*"\])*$/;

const rule: OpenTofuRuleDefinition<{ MessageIds: 'quotedDependsOn' }> = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Disallow quoted references in `depends_on`; use bare references.',
      recommended: true,
      severity: 'warn',
    },
    messages: {
      quotedDependsOn:
        'Quoted reference in `depends_on` is deprecated. Use a bare reference, e.g. `[aws_instance.example]`.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (!KINDS.has(node.kind)) return;
        const attr = findAttribute(node.body.attributes, 'depends_on');
        if (attr?.expression.type !== 'TupleConsExpr') return;
        for (const el of attr.expression.exprs) {
          // literalStringValue returns a string only for an all-literal
          // TemplateExpr, so bare references and the `"${ref}"` form (owned by
          // prefer-bare-expression) both fall through untouched.
          const value = literalStringValue(el);
          if (value === undefined) continue;
          context.report({
            node: el,
            messageId: 'quotedDependsOn',
            fix: REFERENCE.test(value)
              ? (fixer) => fixer.replaceText(el, value)
              : undefined,
          });
        }
      },
    };
  },
};

export default rule;
