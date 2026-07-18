import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-s3-bucket-object.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-s3-bucket-object', rule, {
  valid: [
    {
      code: 'resource "aws_s3_object" "doc" {\n  bucket = "b"\n  key = "k"\n}',
    },
    {
      code: 'resource "aws_s3_bucket_object_lock_configuration" "this" {\n  bucket = "b"\n}',
    },
    { code: 'data "aws_s3_objects" "all" {\n  bucket = "b"\n}' },
  ],
  invalid: [
    {
      code: 'resource "aws_s3_bucket_object" "doc" {\n  bucket = "b"\n  key = "k"\n}',
      errors: [
        {
          messageId: 'deprecatedS3BucketObject',
          data: { type: 'aws_s3_bucket_object', replacement: 'aws_s3_object' },
        },
      ],
    },
    {
      code: 'data "aws_s3_bucket_object" "doc" {\n  bucket = "b"\n  key = "k"\n}',
      errors: [
        {
          messageId: 'deprecatedS3BucketObject',
          data: { type: 'aws_s3_bucket_object', replacement: 'aws_s3_object' },
        },
      ],
    },
    {
      code: 'data "aws_s3_bucket_objects" "all" {\n  bucket = "b"\n}',
      errors: [
        {
          messageId: 'deprecatedS3BucketObject',
          data: {
            type: 'aws_s3_bucket_objects',
            replacement: 'aws_s3_objects',
          },
        },
      ],
    },
  ],
});
