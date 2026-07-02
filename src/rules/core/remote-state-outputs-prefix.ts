import type { Traverser } from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import { traversalText } from './utils.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'missingOutputsPrefix' }> = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Flag a `data.terraform_remote_state` reference that omits the required `.outputs.` prefix, required since Terraform 0.12.',
      recommended: true,
      severity: 'error',
    },
    messages: {
      missingOutputsPrefix:
        'Reference a remote state attribute through `.outputs.`. Since Terraform 0.12, `data.terraform_remote_state.<name>` exposes outputs under `.outputs`.',
    },
    schema: [],
  },
  create(context) {
    return {
      ScopeTraversalExpr(node) {
        const [root, dataSource, name, attr] = node.traversal;
        if (root?.type !== 'TraverseRoot' || root.name !== 'data') return;
        if (
          dataSource?.type !== 'TraverseAttr' ||
          dataSource.name !== 'terraform_remote_state'
        )
          return;
        if (name?.type !== 'TraverseAttr') return;
        if (attr?.type !== 'TraverseAttr' || attr.name === 'outputs') return;
        const outputsStep: Traverser = {
          type: 'TraverseAttr',
          name: 'outputs',
          range: node.range,
        };
        const spliced = {
          ...node,
          traversal: [
            root,
            dataSource,
            name,
            outputsStep,
            ...node.traversal.slice(3),
          ],
        };
        context.report({
          node,
          messageId: 'missingOutputsPrefix',
          fix: (fixer) => fixer.replaceText(node, traversalText(spliced)),
        });
      },
    };
  },
};

export default rule;
