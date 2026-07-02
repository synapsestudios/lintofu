import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-quoted-type-constraints.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-quoted-type-constraints', rule, {
  valid: [
    { code: 'variable "a" { type = string }' },
    { code: 'variable "a" { type = number }' },
    { code: 'variable "a" { type = bool }' },
    { code: 'variable "a" { type = any }' },
    { code: 'variable "a" { type = list(string) }' },
    { code: 'variable "a" { type = map(string) }' },
    { code: 'variable "a" { type = object({ name = string }) }' },
    { code: 'variable "a" { type = "${local.t}" }' },
    { code: 'variable "a" { type = "custom" }' },
    { code: 'variable "a" { default = "string" }' },
    { code: 'locals { type = "string" }' },
    { code: 'resource "aws_ebs_volume" "v" { type = "gp3" }' },
  ],
  invalid: [
    {
      code: 'variable "a" { type = "string" }',
      output: 'variable "a" { type = string }',
      errors: [{ messageId: 'quotedTypeConstraint' }],
    },
    {
      code: 'variable "a" { type = "number" }',
      output: 'variable "a" { type = number }',
      errors: [{ messageId: 'quotedTypeConstraint' }],
    },
    {
      code: 'variable "a" { type = "bool" }',
      output: 'variable "a" { type = bool }',
      errors: [{ messageId: 'quotedTypeConstraint' }],
    },
    {
      code: 'variable "a" { type = "any" }',
      output: 'variable "a" { type = any }',
      errors: [{ messageId: 'quotedTypeConstraint' }],
    },
    {
      code: 'variable "a" { type = "list" }',
      output: 'variable "a" { type = list(string) }',
      errors: [{ messageId: 'quotedTypeConstraint' }],
    },
    {
      code: 'variable "a" { type = "map" }',
      output: 'variable "a" { type = map(string) }',
      errors: [{ messageId: 'quotedTypeConstraint' }],
    },
    {
      code: 'variable "a" { type = "set" }',
      output: 'variable "a" { type = set(string) }',
      errors: [{ messageId: 'quotedTypeConstraint' }],
    },
    {
      code: 'variable "a" { type = "object" }',
      output: null,
      errors: [{ messageId: 'quotedTypeConstraint' }],
    },
    {
      code: 'variable "a" { type = "tuple" }',
      output: null,
      errors: [{ messageId: 'quotedTypeConstraint' }],
    },
  ],
});
