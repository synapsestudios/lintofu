import type { OpenTofuRuleDefinition } from '../../types.js';
import { blockLabel, findAttribute, literalStringValue } from './utils.js';

function isPinnedSource(source: string, hasVersion: boolean): boolean {
  if (source.startsWith('./') || source.startsWith('../')) return true;
  if (source.includes('?ref=')) return true;
  return hasVersion;
}

const rule: OpenTofuRuleDefinition<{ MessageIds: 'unpinnedSource' }> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require module sources to be pinned via `?ref=`, a `version` attribute, or a local path.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      unpinnedSource:
        'Module `{{name}}` source is not pinned; add a `version` attribute or use a `?ref=` git URL.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'module') return;
        const sourceAttr = findAttribute(node.body.attributes, 'source');
        if (!sourceAttr) return;
        const source = literalStringValue(sourceAttr.expression);
        if (source === undefined) return;

        const hasVersion = !!findAttribute(node.body.attributes, 'version');
        if (isPinnedSource(source, hasVersion)) return;

        const label = blockLabel(node);
        context.report({
          node: sourceAttr,
          messageId: 'unpinnedSource',
          data: { name: label },
        });
      },
    };
  },
};

export default rule;
