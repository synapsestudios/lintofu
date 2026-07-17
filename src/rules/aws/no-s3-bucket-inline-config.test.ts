import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-s3-bucket-inline-config.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-s3-bucket-inline-config', rule, {
  valid: [
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
}`,
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket              = "b"
  tags                = { env = "prod" }
  object_lock_enabled = true
}`,
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  lifecycle {
    ignore_changes = [tags]
  }
}`,
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  dynamic "not_deprecated" {
    for_each = var.things
    content {}
  }
}`,
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  dynamic "acl" {
    for_each = var.acls
    content {}
  }
}`,
    },
    {
      code: `resource "aws_launch_template" "x" {
  logging {}
}`,
    },
    {
      code: `resource "aws_launch_template" "x" {
  acl = "private"
}`,
    },
    {
      code: `data "aws_s3_bucket" "x" {
  bucket = "b"
}`,
    },
  ],
  invalid: [
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  acl    = "private"
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: { name: 'acl', replacement: 'aws_s3_bucket_acl' },
        },
      ],
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  policy = "{}"
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: { name: 'policy', replacement: 'aws_s3_bucket_policy' },
        },
      ],
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket        = "b"
  request_payer = "Requester"
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: {
            name: 'request_payer',
            replacement: 'aws_s3_bucket_request_payment_configuration',
          },
        },
      ],
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket              = "b"
  acceleration_status = "Enabled"
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: {
            name: 'acceleration_status',
            replacement: 'aws_s3_bucket_accelerate_configuration',
          },
        },
      ],
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  logging {}
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: { name: 'logging', replacement: 'aws_s3_bucket_logging' },
        },
      ],
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  cors_rule {}
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: {
            name: 'cors_rule',
            replacement: 'aws_s3_bucket_cors_configuration',
          },
        },
      ],
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  grant {}
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: { name: 'grant', replacement: 'aws_s3_bucket_acl' },
        },
      ],
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  lifecycle_rule {}
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: {
            name: 'lifecycle_rule',
            replacement: 'aws_s3_bucket_lifecycle_configuration',
          },
        },
      ],
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  object_lock_configuration {}
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: {
            name: 'object_lock_configuration',
            replacement: 'aws_s3_bucket_object_lock_configuration',
          },
        },
      ],
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  replication_configuration {}
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: {
            name: 'replication_configuration',
            replacement: 'aws_s3_bucket_replication_configuration',
          },
        },
      ],
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  server_side_encryption_configuration {}
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: {
            name: 'server_side_encryption_configuration',
            replacement: 'aws_s3_bucket_server_side_encryption_configuration',
          },
        },
      ],
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  versioning {}
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: {
            name: 'versioning',
            replacement: 'aws_s3_bucket_versioning',
          },
        },
      ],
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  website {}
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: {
            name: 'website',
            replacement: 'aws_s3_bucket_website_configuration',
          },
        },
      ],
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  dynamic "cors_rule" {
    for_each = var.rules
    content {}
  }
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: {
            name: 'cors_rule',
            replacement: 'aws_s3_bucket_cors_configuration',
          },
        },
      ],
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  dynamic "grant" {
    for_each = var.grants
    content {}
  }
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: { name: 'grant', replacement: 'aws_s3_bucket_acl' },
        },
      ],
    },
    {
      code: `resource "aws_s3_bucket" "b" {
  bucket = "b"
  acl    = "private"
  versioning {}
  dynamic "cors_rule" {
    for_each = var.rules
    content {}
  }
}`,
      errors: [
        {
          messageId: 'inlineConfig',
          data: { name: 'acl', replacement: 'aws_s3_bucket_acl' },
        },
        {
          messageId: 'inlineConfig',
          data: {
            name: 'versioning',
            replacement: 'aws_s3_bucket_versioning',
          },
        },
        {
          messageId: 'inlineConfig',
          data: {
            name: 'cors_rule',
            replacement: 'aws_s3_bucket_cors_configuration',
          },
        },
      ],
    },
  ],
});
