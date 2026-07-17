import type { OpenTofuRuleDefinition } from '../../types.js';

const ATTRIBUTE_REPLACEMENTS: Record<string, string> = {
  acl: 'aws_s3_bucket_acl',
  policy: 'aws_s3_bucket_policy',
  request_payer: 'aws_s3_bucket_request_payment_configuration',
  acceleration_status: 'aws_s3_bucket_accelerate_configuration',
};

const BLOCK_REPLACEMENTS: Record<string, string> = {
  grant: 'aws_s3_bucket_acl',
  cors_rule: 'aws_s3_bucket_cors_configuration',
  lifecycle_rule: 'aws_s3_bucket_lifecycle_configuration',
  logging: 'aws_s3_bucket_logging',
  object_lock_configuration: 'aws_s3_bucket_object_lock_configuration',
  replication_configuration: 'aws_s3_bucket_replication_configuration',
  server_side_encryption_configuration:
    'aws_s3_bucket_server_side_encryption_configuration',
  versioning: 'aws_s3_bucket_versioning',
  website: 'aws_s3_bucket_website_configuration',
};

const rule: OpenTofuRuleDefinition<{ MessageIds: 'inlineConfig' }> = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag deprecated inline configuration on `aws_s3_bucket`; use the dedicated standalone `aws_s3_bucket_*` resources instead.',
      recommended: true,
      severity: 'warn',
      category: 'aws',
    },
    messages: {
      inlineConfig:
        'The inline `{{name}}` configuration on `aws_s3_bucket` is deprecated; use the standalone `{{replacement}}` resource instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        if (node.labels[0] !== 'aws_s3_bucket') return;

        for (const attr of node.body.attributes) {
          const replacement = ATTRIBUTE_REPLACEMENTS[attr.name];
          if (replacement !== undefined) {
            context.report({
              node: attr,
              messageId: 'inlineConfig',
              data: { name: attr.name, replacement },
            });
          }
        }
        for (const inner of node.body.blocks) {
          const name = inner.kind === 'dynamic' ? inner.labels[0] : inner.kind;
          if (name === undefined) continue;
          const replacement = BLOCK_REPLACEMENTS[name];
          if (replacement !== undefined) {
            context.report({
              node: inner,
              messageId: 'inlineConfig',
              data: { name, replacement },
            });
          }
        }
      },
    };
  },
};

export default rule;
