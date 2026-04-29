import type { OpenTofuRuleDefinition } from '../../types.js';
import { literalStringValue, objectItemKeyName } from '../utils.js';

function isHashicorpTemplateSource(source: string): boolean {
  const segments = source.split('/');
  if (segments.length < 2) return false;
  return (
    segments[segments.length - 2] === 'hashicorp' &&
    segments[segments.length - 1] === 'template'
  );
}

const rule: OpenTofuRuleDefinition<{
  MessageIds:
    | 'useTemplatefile'
    | 'useCloudinitProvider'
    | 'archivedTemplateProvider';
}> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag use of the archived `hashicorp/template` provider; prefer the built-in `templatefile()` function or the `cloudinit` provider.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      useTemplatefile:
        'The `hashicorp/template` provider is archived. Replace `data.template_*` with the built-in `templatefile()` function.',
      useCloudinitProvider:
        'The `hashicorp/template` provider is archived. Replace `data.template_cloudinit_config` with `cloudinit_config` from the `hashicorp/cloudinit` provider.',
      archivedTemplateProvider:
        'The `hashicorp/template` provider is archived; remove this `required_providers` entry.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind === 'data') {
          if (
            node.labels[0] === 'template_file' ||
            node.labels[0] === 'template_dir'
          ) {
            context.report({ node, messageId: 'useTemplatefile' });
          } else if (node.labels[0] === 'template_cloudinit_config') {
            context.report({ node, messageId: 'useCloudinitProvider' });
          }
          return;
        }
        if (node.kind !== 'terraform') return;
        const requiredProviders = node.body.blocks.find(
          (b) => b.kind === 'required_providers',
        );
        if (!requiredProviders) return;
        for (const attr of requiredProviders.body.attributes) {
          if (attr.expression.type !== 'ObjectConsExpr') continue;
          const sourceItem = attr.expression.items.find(
            (item) => objectItemKeyName(item) === 'source',
          );
          if (!sourceItem) continue;
          const source = literalStringValue(sourceItem.valueExpr);
          if (source === undefined) continue;
          if (isHashicorpTemplateSource(source)) {
            context.report({
              node: attr,
              messageId: 'archivedTemplateProvider',
            });
          }
        }
      },
    };
  },
};

export default rule;
