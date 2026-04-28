import type { OpenTofuRuleDefinition } from '../../types.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'preferBareExpression' }> = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer the bare expression form over the redundant "${expr}" wrapping.',
      recommended: true,
      severity: 'warn',
    },
    messages: {
      preferBareExpression:
        'Unwrap this "${...}" expression and write it bare; the wrapper adds nothing.',
    },
    schema: [],
  },
  create(context) {
    return {
      TemplateWrapExpr(node) {
        context.report({ node, messageId: 'preferBareExpression' });
      },
    };
  },
};

export default rule;
