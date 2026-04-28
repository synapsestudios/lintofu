// Source-of-truth for the README "Writing your own rule" example.
// If this stops type-checking, update the README too.
//
// The whole rule fits in ~15 lines using only public-API imports.

import type { OpenTofuRuleDefinition } from './index.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'missingTags' }> = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Require resources to declare a `tags` attribute.' },
    messages: {
      missingTags: 'Resource `{{name}}` is missing a `tags` attribute.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        if (node.body.attributes.some((a) => a.name === 'tags')) return;
        const name = node.labels[1] ?? '<unnamed>';
        context.report({ node, messageId: 'missingTags', data: { name } });
      },
    };
  },
};

export default rule;
