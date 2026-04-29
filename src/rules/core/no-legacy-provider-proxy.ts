import type { OpenTofuRuleDefinition } from '../../types.js';
import { literalStringValue } from '../utils.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'legacyProviderProxy' }> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag empty `provider` blocks that exist only to declare an alias; replace with `configuration_aliases` in `required_providers`.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      legacyProviderProxy:
        'Empty proxy `provider` block for alias `{{provider}}.{{alias}}`. Move the alias declaration into `terraform.required_providers` via `configuration_aliases = [{{provider}}.{{alias}}]`.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'provider') return;
        const provider = node.labels[0];
        if (!provider) return;
        if (node.body.blocks.length > 0) return;
        const [aliasAttr, ...rest] = node.body.attributes;
        if (!aliasAttr || rest.length > 0) return;
        if (aliasAttr.name !== 'alias') return;
        const alias = literalStringValue(aliasAttr.expression);
        if (alias === undefined) return;
        context.report({
          node,
          messageId: 'legacyProviderProxy',
          data: { provider, alias },
        });
      },
    };
  },
};

export default rule;
