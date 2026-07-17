import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-iam-policy-attachment.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-iam-policy-attachment', rule, {
  valid: [
    {
      code: `resource "aws_iam_role_policy_attachment" "attach" {
  role       = aws_iam_role.example.name
  policy_arn = aws_iam_policy.example.arn
}`,
    },
    {
      code: `resource "aws_iam_user_policy_attachment" "attach" {
  user       = aws_iam_user.example.name
  policy_arn = aws_iam_policy.example.arn
}`,
    },
    {
      code: `resource "aws_iam_group_policy_attachment" "attach" {
  group      = aws_iam_group.example.name
  policy_arn = aws_iam_policy.example.arn
}`,
    },
    {
      code: `resource "aws_iam_role_policy_attachments_exclusive" "exclusive" {
  role_name   = aws_iam_role.example.name
  policy_arns = [aws_iam_policy.example.arn]
}`,
    },
    {
      code: `resource "aws_iam_policy" "example" {
  name   = "example"
  policy = "{}"
}`,
    },
    {
      code: `data "aws_iam_policy_attachment" "x" {
}`,
    },
  ],
  invalid: [
    {
      code: `resource "aws_iam_policy_attachment" "attach" {
  name       = "attach"
  policy_arn = aws_iam_policy.example.arn
  roles      = [aws_iam_role.example.name]
}`,
      errors: [{ messageId: 'iamPolicyAttachment' }],
    },
  ],
});
