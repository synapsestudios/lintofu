import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute } from '../core/utils.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'dbInstanceName' }> = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Flag the top-level `name` argument on `aws_db_instance`, removed in AWS provider v5. Use `db_name` with the same value.',
      recommended: true,
      severity: 'error',
      category: 'aws',
    },
    messages: {
      dbInstanceName:
        'The top-level `name` argument on `aws_db_instance` was removed in AWS provider v5. Use `db_name` with the same value.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        if (node.labels[0] !== 'aws_db_instance') return;
        const nameAttr = findAttribute(node.body.attributes, 'name');
        if (!nameAttr) return;
        context.report({
          node: nameAttr,
          messageId: 'dbInstanceName',
          fix: (fixer) => {
            // Renaming to db_name is safe for any value type, but only when the
            // block does not already declare db_name; otherwise the rename would
            // emit a duplicate argument, which is invalid HCL.
            if (findAttribute(node.body.attributes, 'db_name')) return null;
            return fixer.replaceText(
              nameAttr,
              `db_name = ${context.sourceCode.getText(nameAttr.expression)}`,
            );
          },
        });
      },
    };
  },
};

export default rule;
