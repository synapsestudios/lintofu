import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute } from '../core/utils.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'deploymentStageArg' }> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag `stage_name`, `stage_description`, and `canary_settings` on `aws_api_gateway_deployment`, removed in AWS provider v6; manage the stage with a separate `aws_api_gateway_stage` resource.',
      recommended: true,
      severity: 'error',
      category: 'aws',
    },
    messages: {
      deploymentStageArg:
        'The `{{name}}` argument on `aws_api_gateway_deployment` was removed in AWS provider v6. Manage the stage with a separate `aws_api_gateway_stage` resource.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        if (node.labels[0] !== 'aws_api_gateway_deployment') return;

        for (const name of ['stage_name', 'stage_description']) {
          const attr = findAttribute(node.body.attributes, name);
          if (attr) {
            context.report({
              node: attr,
              messageId: 'deploymentStageArg',
              data: { name },
            });
          }
        }

        const canaryAttr = findAttribute(
          node.body.attributes,
          'canary_settings',
        );
        if (canaryAttr) {
          context.report({
            node: canaryAttr,
            messageId: 'deploymentStageArg',
            data: { name: 'canary_settings' },
          });
        }
        for (const inner of node.body.blocks) {
          if (inner.kind === 'canary_settings') {
            context.report({
              node: inner,
              messageId: 'deploymentStageArg',
              data: { name: 'canary_settings' },
            });
          }
        }
      },
    };
  },
};

export default rule;
