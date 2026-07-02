import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-terraform-env-reference.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-terraform-env-reference', rule, {
  valid: [
    { code: 'output "x" { value = terraform.workspace }' },
    { code: 'output "x" { value = terraform.environment }' },
    { code: 'output "x" { value = var.env }' },
    { code: 'output "x" { value = env }' },
    { code: 'output "x" { value = path.module }' },
  ],
  invalid: [
    {
      code: 'output "x" { value = terraform.env }',
      output: 'output "x" { value = terraform.workspace }',
      errors: [{ messageId: 'terraformEnvReference' }],
    },
    {
      code: 'output "x" { value = "${terraform.env}" }',
      output: 'output "x" { value = "${terraform.workspace}" }',
      errors: [{ messageId: 'terraformEnvReference' }],
    },
    {
      code: 'resource "aws_s3_bucket" "b" { bucket = terraform.env }',
      output: 'resource "aws_s3_bucket" "b" { bucket = terraform.workspace }',
      errors: [{ messageId: 'terraformEnvReference' }],
    },
    {
      code: 'output "x" { value = "${terraform.env}-${terraform.env}" }',
      output:
        'output "x" { value = "${terraform.workspace}-${terraform.workspace}" }',
      errors: [
        { messageId: 'terraformEnvReference' },
        { messageId: 'terraformEnvReference' },
      ],
    },
    {
      code: 'output "x" { value = terraform.env.foo }',
      output: 'output "x" { value = terraform.workspace }',
      errors: [{ messageId: 'terraformEnvReference' }],
    },
    {
      code: 'output "x" { value = terraform.env[0] }',
      output: 'output "x" { value = terraform.workspace }',
      errors: [{ messageId: 'terraformEnvReference' }],
    },
  ],
});
