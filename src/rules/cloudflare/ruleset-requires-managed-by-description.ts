import type { OpenTofuRuleDefinition } from '../../types.js';
import { findLiteralMismatch, literalAttributeValue } from '../core/utils.js';

const DEFAULT_DESCRIPTION = 'Managed by terraform';

const rule: OpenTofuRuleDefinition<{
  RuleOptions: [{ description?: string }?];
  MessageIds: 'missingDescription';
}> = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require a `cloudflare_ruleset` to set its top-level `description` to the configured marker, so the ruleset shows it is managed by Terraform.',
      recommended: true,
      severity: 'warn',
      category: 'cloudflare',
    },
    messages: {
      missingDescription:
        'Set the ruleset `description` to "{{description}}" to mark it as managed by Terraform.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description:
              'The exact top-level `description` that marks a ruleset as managed by Terraform.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ description: DEFAULT_DESCRIPTION }],
  },
  create(context) {
    const description = context.options[0]?.description ?? DEFAULT_DESCRIPTION;
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        if (node.labels[0] !== 'cloudflare_ruleset') return;
        if (literalAttributeValue(node, 'kind') === 'managed') return;
        const mismatch = findLiteralMismatch(node, 'description', description);
        if (!mismatch) return;
        context.report({
          node: mismatch,
          messageId: 'missingDescription',
          data: { description },
        });
      },
    };
  },
};

export default rule;
