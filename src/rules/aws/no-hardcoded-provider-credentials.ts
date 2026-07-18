import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute, literalStringValue } from '../core/utils.js';

const CREDENTIAL_ATTRIBUTES = ['access_key', 'secret_key', 'token'];

const rule: OpenTofuRuleDefinition<{ MessageIds: 'hardcodedCredential' }> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag literal `access_key`, `secret_key`, or `token` values in `provider "aws"` and s3 `backend` blocks, which leak credentials into source control.',
      recommended: true,
      severity: 'error',
      category: 'aws',
    },
    messages: {
      hardcodedCredential:
        'Hard-coded `{{attr}}` in this block leaks the credential into source control and its git history. Supply it from the environment, a shared profile, `assume_role`, or CI OIDC federation instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        const isAwsProvider =
          node.kind === 'provider' && node.labels[0] === 'aws';
        const isS3Backend = node.kind === 'backend' && node.labels[0] === 's3';
        if (!isAwsProvider && !isS3Backend) return;

        for (const name of CREDENTIAL_ATTRIBUTES) {
          const attr = findAttribute(node.body.attributes, name);
          if (!attr) continue;
          const value = literalStringValue(attr.expression);
          if (value === undefined || value.length === 0) continue;
          context.report({
            node: attr,
            messageId: 'hardcodedCredential',
            data: { attr: name },
          });
        }
      },
    };
  },
};

export default rule;
