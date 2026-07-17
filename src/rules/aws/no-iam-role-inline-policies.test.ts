import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-iam-role-inline-policies.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-iam-role-inline-policies', rule, {
  valid: [
    {
      code: `resource "aws_iam_role" "example" {
  name               = "example"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}`,
    },
    {
      code: `resource "aws_iam_role" "example" {
  name = "example"
  dynamic "setting" {
    for_each = var.settings
    content {
      key = setting.value
    }
  }
}`,
    },
    {
      code: `resource "aws_iam_role_policy" "example" {
  name   = "example"
  role   = aws_iam_role.example.id
  policy = jsonencode({})
}`,
    },
    {
      code: `resource "aws_iam_role_policy_attachment" "example" {
  role       = aws_iam_role.example.name
  policy_arn = aws_iam_policy.example.arn
}`,
    },
    {
      code: `resource "aws_iam_user" "example" {
  name = "example"
  inline_policy {
    name   = "inline"
    policy = jsonencode({})
  }
}`,
    },
    {
      code: `resource "aws_s3_bucket" "example" {
  bucket              = "example"
  managed_policy_arns = []
}`,
    },
  ],
  invalid: [
    {
      code: `resource "aws_iam_role" "example" {
  name = "example"
  inline_policy {
    name   = "inline"
    policy = jsonencode({})
  }
}`,
      errors: [{ messageId: 'inlinePolicy' }],
    },
    {
      code: `resource "aws_iam_role" "example" {
  name = "example"
  dynamic "inline_policy" {
    for_each = var.policies
    content {
      name   = inline_policy.value.name
      policy = inline_policy.value.policy
    }
  }
}`,
      errors: [{ messageId: 'inlinePolicy' }],
    },
    {
      code: `resource "aws_iam_role" "example" {
  name                = "example"
  managed_policy_arns = [aws_iam_policy.example.arn]
}`,
      errors: [{ messageId: 'managedPolicyArns' }],
    },
    {
      code: `resource "aws_iam_role" "example" {
  name                = "example"
  managed_policy_arns = []
}`,
      errors: [{ messageId: 'managedPolicyArns' }],
    },
    {
      code: `resource "aws_iam_role" "example" {
  name = "example"
  inline_policy {
    name   = "inline"
    policy = jsonencode({})
  }
  dynamic "inline_policy" {
    for_each = var.policies
    content {
      name   = inline_policy.value.name
      policy = inline_policy.value.policy
    }
  }
  managed_policy_arns = [aws_iam_policy.example.arn]
}`,
      errors: [
        { messageId: 'inlinePolicy' },
        { messageId: 'inlinePolicy' },
        { messageId: 'managedPolicyArns' },
      ],
    },
  ],
});
