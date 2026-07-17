import type { Attribute } from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute } from '../core/utils.js';

function removalRange(
  source: string,
  attr: Attribute,
): [number, number] | undefined {
  let start = attr.range.start.offset;
  let end = attr.range.end.offset;
  while (start > 0 && (source[start - 1] === ' ' || source[start - 1] === '\t'))
    start--;
  while (source[end] === ' ' || source[end] === '\t') end++;
  const next = source[end];
  if (next === '\r' && source[end + 1] === '\n') return [start, end + 2];
  if (next === '\n') return [start, end + 1];
  if (next === undefined || next === '}') return [start, end];
  return undefined;
}

const rule: OpenTofuRuleDefinition<{ MessageIds: 'eipVpcAttribute' }> = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Flag the `vpc` argument on `aws_eip`, removed in AWS provider v6. Use `domain = "vpc"` (or omit `domain`).',
      recommended: true,
      severity: 'error',
      category: 'aws',
    },
    messages: {
      eipVpcAttribute:
        'The `vpc` argument was removed from `aws_eip` in AWS provider v6 and fails validate and plan. Set `domain = "vpc"` (or omit `domain`) instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        if (node.labels[0] !== 'aws_eip') return;
        const vpcAttr = findAttribute(node.body.attributes, 'vpc');
        if (!vpcAttr) return;
        context.report({
          node: vpcAttr,
          messageId: 'eipVpcAttribute',
          fix: (fixer) => {
            const expr = vpcAttr.expression;
            if (
              expr.type !== 'LiteralValueExpr' ||
              typeof expr.value !== 'boolean'
            )
              return null;
            if (expr.value) {
              if (findAttribute(node.body.attributes, 'domain')) return null;
              return fixer.replaceText(vpcAttr, 'domain = "vpc"');
            }
            const range = removalRange(context.sourceCode.getText(), vpcAttr);
            return range ? fixer.replaceTextRange(range, '') : null;
          },
        });
      },
    };
  },
};

export default rule;
