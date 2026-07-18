import type { OpenTofuRuleDefinition } from '../../types.js';

const rule: OpenTofuRuleDefinition<{ MessageIds: 'deprecatedS3BucketObject' }> =
  {
    meta: {
      type: 'suggestion',
      docs: {
        description:
          'Flag the deprecated `aws_s3_bucket_object` resource and data source and the `aws_s3_bucket_objects` data source; use `aws_s3_object` and `aws_s3_objects` instead.',
        recommended: true,
        severity: 'warn',
        category: 'aws',
      },
      messages: {
        deprecatedS3BucketObject:
          'The `{{type}}` type is a deprecated alias. Use `{{replacement}}` instead; migrating needs a manual import because renaming the type forces a destroy and recreate.',
      },
      schema: [],
    },
    create(context) {
      return {
        Block(node) {
          const type = node.labels[0];
          if (type === undefined) return;

          let replacement: string | undefined;
          if (node.kind === 'resource' && type === 'aws_s3_bucket_object') {
            replacement = 'aws_s3_object';
          } else if (node.kind === 'data' && type === 'aws_s3_bucket_object') {
            replacement = 'aws_s3_object';
          } else if (node.kind === 'data' && type === 'aws_s3_bucket_objects') {
            replacement = 'aws_s3_objects';
          }

          if (replacement === undefined) return;

          context.report({
            node,
            messageId: 'deprecatedS3BucketObject',
            data: { type, replacement },
          });
        },
      };
    },
  };

export default rule;
