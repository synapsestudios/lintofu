import type { Attribute, Block } from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import {
  findAttribute,
  findLiteralMismatch,
  literalStringValue,
} from '../core/utils.js';
import {
  entitlesDnsRecordTags,
  INVALID_PLAN_MESSAGE,
  readCloudflarePlan,
} from './utils.js';

const DEFAULT_COMMENT = 'Managed by terraform';
const DEFAULT_TAG = 'managed-by:terraform';

// Cloudflare compares tag names without case and tag values with case.
function tagsMatch(candidate: string, tag: string): boolean {
  const [candidateName, ...candidateValue] = candidate.split(':');
  const [tagName, ...tagValue] = tag.split(':');
  return (
    candidateName?.toLowerCase() === tagName?.toLowerCase() &&
    candidateValue.join(':') === tagValue.join(':')
  );
}

function findMissingTag(
  block: Block,
  tag: string,
): Block | Attribute | undefined {
  const attr = findAttribute(block.body.attributes, 'tags');
  if (!attr) return block;
  if (attr.expression.type !== 'TupleConsExpr') return undefined;
  const values = attr.expression.exprs.map(literalStringValue);
  if (values.some((value) => value !== undefined && tagsMatch(value, tag))) {
    return undefined;
  }
  return values.includes(undefined) ? undefined : attr;
}

const rule: OpenTofuRuleDefinition<{
  RuleOptions: [{ comment?: string; tag?: string }?];
  MessageIds: 'missingComment' | 'missingTag' | 'invalidPlan';
}> = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require a `cloudflare_dns_record` to carry the configured `comment`, plus the configured tag when `settings.lintofu.cloudflare.plan` is Pro or higher, so the record shows it is managed by Terraform.',
      recommended: true,
      severity: 'warn',
      category: 'cloudflare',
      appliesTo: { cloudflare: '>=5.0.0' },
    },
    messages: {
      missingComment:
        'Set the DNS record `comment` to "{{comment}}" to mark it as managed by Terraform.',
      missingTag:
        'Add "{{tag}}" to the DNS record `tags` to mark it as managed by Terraform. The configured "{{plan}}" plan supports DNS record tags.',
      invalidPlan: INVALID_PLAN_MESSAGE,
    },
    schema: [
      {
        type: 'object',
        properties: {
          comment: {
            type: 'string',
            description:
              'The exact `comment` that marks a DNS record as managed by Terraform.',
          },
          tag: {
            type: 'string',
            description:
              'The `name:value` tag that marks a DNS record as managed by Terraform. The name matches without case and the value with case.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ comment: DEFAULT_COMMENT, tag: DEFAULT_TAG }],
  },
  create(context) {
    const comment = context.options[0]?.comment ?? DEFAULT_COMMENT;
    const tag = context.options[0]?.tag ?? DEFAULT_TAG;
    const setting = readCloudflarePlan(context.settings);
    const tagPlan =
      setting.state === 'valid' && entitlesDnsRecordTags(setting.plan)
        ? setting.plan
        : undefined;
    return {
      Body(node) {
        if (setting.state !== 'invalid') return;
        if (node !== context.sourceCode.ast) return;
        context.report({
          node,
          messageId: 'invalidPlan',
          data: { value: setting.value },
        });
      },
      Block(node) {
        if (node.kind !== 'resource') return;
        if (node.labels[0] !== 'cloudflare_dns_record') return;
        const commentMismatch = findLiteralMismatch(node, 'comment', comment);
        if (commentMismatch) {
          context.report({
            node: commentMismatch,
            messageId: 'missingComment',
            data: { comment },
          });
        }
        if (tagPlan === undefined) return;
        const missingTag = findMissingTag(node, tag);
        if (missingTag) {
          context.report({
            node: missingTag,
            messageId: 'missingTag',
            data: { tag, plan: tagPlan },
          });
        }
      },
    };
  },
};

export default rule;
