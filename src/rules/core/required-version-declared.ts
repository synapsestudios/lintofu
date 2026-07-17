import type { Block } from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute } from './utils.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'missingRequiredVersion' }> = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require a `terraform` block that declares `required_providers` to also declare `required_version` somewhere in the same file.',
      recommended: true,
      severity: 'warn',
    },
    messages: {
      missingRequiredVersion:
        'This `terraform` block declares `required_providers` but no `terraform` block in this file sets `required_version`; add `required_version` to constrain the CLI version.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'terraform') return;
        if (!declaresRequiredProviders(node)) return;
        const fileDeclaresRequiredVersion = context.sourceCode.ast.blocks.some(
          (b) => b.kind === 'terraform' && declaresRequiredVersion(b),
        );
        if (fileDeclaresRequiredVersion) return;
        context.report({ node, messageId: 'missingRequiredVersion' });
      },
    };
  },
};

export default rule;

function declaresRequiredProviders(block: Block): boolean {
  return (
    block.body.blocks.some((b) => b.kind === 'required_providers') ||
    findAttribute(block.body.attributes, 'required_providers') !== undefined
  );
}

function declaresRequiredVersion(block: Block): boolean {
  return findAttribute(block.body.attributes, 'required_version') !== undefined;
}
