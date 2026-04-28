import type {
  Block,
  ObjectConsExpr,
  ScopeTraversalExpr,
  TemplateWrapExpr,
} from './parser/types.js';
import type { OpenTofuRuleDefinition, OpenTofuRuleVisitor } from './types.js';

const _v1: OpenTofuRuleVisitor = {
  Block(_node: Block) {},
};

const _v2: OpenTofuRuleVisitor = {
  TemplateWrapExpr(_node: TemplateWrapExpr) {},
  ScopeTraversalExpr(_node: ScopeTraversalExpr) {},
  ObjectConsExpr(_node: ObjectConsExpr) {},
};

const _v3: OpenTofuRuleVisitor = {
  // @ts-expect-error misnamed visitor key (typo) must fail at compile time
  Bock(_node: Block) {},
};

const _v4: OpenTofuRuleVisitor = {
  Block(node) {
    // node should narrow to Block via the mapped type
    const _kind: string = node.kind;
    const _labels: readonly string[] = node.labels;
  },
};

const _sampleRule: OpenTofuRuleDefinition<{ MessageIds: 'missingThing' }> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'x',
      recommended: true,
      severity: 'error',
    },
    messages: { missingThing: 'msg' },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        context.report({ node, messageId: 'missingThing' });
        // @ts-expect-error wrong messageId must fail
        context.report({ node, messageId: 'nope' });
      },
    };
  },
};

// LintofuRuleDocs fields type-check on meta.docs by default.
const _ruleWithDefaultDocs: OpenTofuRuleDefinition<{ MessageIds: 'x' }> = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'y',
      recommended: false,
      severity: 'warn',
      category: 'aws',
    },
    messages: { x: 'm' },
    schema: [],
  },
  create() {
    return {};
  },
};
