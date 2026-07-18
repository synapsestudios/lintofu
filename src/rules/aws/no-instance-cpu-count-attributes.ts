import type { Attribute } from '../../parser/types.js';
import type { OpenTofuSourceCode } from '../../source-code.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute } from '../core/utils.js';

const ATTR_MAP = {
  cpu_core_count: 'core_count',
  cpu_threads_per_core: 'threads_per_core',
} as const;

type OffendingName = keyof typeof ATTR_MAP;
interface Offender {
  name: OffendingName;
  attr: Attribute;
}

const OFFENDING_NAMES = Object.keys(ATTR_MAP) as OffendingName[];

function lineStart(text: string, offset: number): number {
  let start = offset;
  while (start > 0 && text[start - 1] !== '\n') start--;
  return start;
}

function lineIndent(text: string, offset: number): string {
  return text.slice(lineStart(text, offset), offset);
}

function fullLineRange(text: string, attr: Attribute): [number, number] {
  let end = attr.expression.range.end.offset;
  while (end < text.length && text[end] !== '\n') end++;
  if (end < text.length) end++;
  return [lineStart(text, attr.range.start.offset), end];
}

function buildCpuOptionsBlock(
  indent: string,
  offending: readonly Offender[],
  sourceCode: OpenTofuSourceCode,
): string {
  const inner = offending
    .map(
      (o) =>
        `${indent}  ${ATTR_MAP[o.name]} = ${sourceCode.getText(o.attr.expression)}`,
    )
    .join('\n');
  return `cpu_options {\n${inner}\n${indent}}`;
}

const rule: OpenTofuRuleDefinition<{ MessageIds: 'cpuCountAttribute' }> = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Flag `cpu_core_count` and `cpu_threads_per_core` on `aws_instance`, removed in AWS provider v6; move the values into a `cpu_options` block.',
      recommended: true,
      severity: 'error',
      category: 'aws',
      appliesTo: { aws: '>=6.0.0' },
    },
    messages: {
      cpuCountAttribute:
        'Remove `{{attribute}}` from `aws_instance`; it was removed in AWS provider v6. Set `{{replacement}}` inside a `cpu_options` block instead.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        if (node.labels[0] !== 'aws_instance') return;

        const offending: Offender[] = OFFENDING_NAMES.map((name) => ({
          name,
          attr: findAttribute(node.body.attributes, name),
        })).filter((o): o is Offender => o.attr !== undefined);
        if (offending.length === 0) return;

        const anchor = offending.reduce((a, b) =>
          b.attr.range.start.offset < a.attr.range.start.offset ? b : a,
        );

        const hasCpuOptions = node.body.blocks.some(
          (b) => b.kind === 'cpu_options',
        );
        const allLiteral = offending.every(
          (o) => o.attr.expression.type === 'LiteralValueExpr',
        );
        const fixable = allLiteral && !hasCpuOptions;

        for (const o of offending) {
          context.report({
            node: o.attr,
            messageId: 'cpuCountAttribute',
            data: { attribute: o.name, replacement: ATTR_MAP[o.name] },
            // ESLint drops overlapping fixes, so the whole migration is emitted
            // once on the anchor and the other diagnostics carry none.
            fix:
              fixable && o === anchor
                ? (fixer) => {
                    const text = sourceCode.getText();
                    const indent = lineIndent(
                      text,
                      anchor.attr.range.start.offset,
                    );
                    const block = buildCpuOptionsBlock(
                      indent,
                      offending,
                      sourceCode,
                    );
                    return [
                      fixer.replaceTextRange(
                        [
                          anchor.attr.range.start.offset,
                          anchor.attr.expression.range.end.offset,
                        ],
                        block,
                      ),
                      ...offending
                        .filter((other) => other !== anchor)
                        .map((other) =>
                          fixer.removeRange(fullLineRange(text, other.attr)),
                        ),
                    ];
                  }
                : undefined,
          });
        }
      },
    };
  },
};

export default rule;
