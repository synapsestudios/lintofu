# Writing your own rule

`lintofu` re-exports the same rule-authoring types it uses internally, so a custom rule type-checks without reaching into private modules.

```ts
import type { OpenTofuRuleDefinition } from '@synapsestudios/lintofu';

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
```

`OpenTofuRuleDefinition<Options>` fills in everything ESLint's `RuleDefinition` needs (`LangOptions`, `Code`, `Visitor`, `Node`, `ExtRuleDocs`); pass `MessageIds` as a string literal union and message ids cross-check against `meta.messages` and `context.report`. The visitor is a mapped type over the AST, so `Block`, `Attribute`, `ScopeTraversalExpr`, etc. autocomplete and a typo (`Bock`) is a compile error. AST node types (`Block`, `Body`, `Attribute`, `Expression`, `ScopeTraversalExpr`, …) and the parser-services shape (`TofuParserServices`, `ProjectIndex`) are re-exported from the package root.
