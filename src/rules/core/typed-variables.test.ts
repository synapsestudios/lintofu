import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './typed-variables.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('typed-variables', rule, {
  valid: [
    { code: 'variable "x" { type = string }' },
    { code: 'variable "x" { type = number }' },
    { code: 'variable "x" { type = bool }' },
    { code: 'variable "x" { type = list(string) }' },
    { code: 'variable "x" { type = object({ name = string }) }' },
    { code: 'variable "x" { type = any }' },
    { code: 'variable "x" { type = "string" }' },
    { code: 'variable "x" { type = "custom" }' },
    { code: 'variable "x" { type = "${local.t}" }' },
    { code: 'output "x" { value = 1 }' },
    { code: 'resource "aws_s3_bucket" "b" { bucket = "x" }' },
    { code: 'locals { region = "us-east-1" }' },
  ],
  invalid: [
    { code: 'variable "x" {}', errors: [{ messageId: 'missingType' }] },
    {
      code: 'variable "x" { default = "value" }',
      errors: [{ messageId: 'missingType' }],
    },
    {
      code: 'variable "a" { type = string }\nvariable "b" {}',
      errors: [{ messageId: 'missingType' }],
    },
  ],
});
