import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-empty-list-equality.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-empty-list-equality', rule, {
  valid: [
    { code: 'output "x" { value = length(var.list) == 0 }' },
    { code: 'output "x" { value = length(var.list) != 0 }' },
    { code: 'output "x" { value = var.a == var.b }' },
    { code: 'output "x" { value = var.list == [1] }' },
    { code: 'output "x" { value = var.a == "" }' },
    { code: 'output "x" { value = length([]) == 0 }' },
  ],
  invalid: [
    {
      code: 'output "x" { value = var.list == [] }',
      output: 'output "x" { value = length(var.list) == 0 }',
      errors: [{ messageId: 'emptyListEquality' }],
    },
    {
      code: 'output "x" { value = var.list != [] }',
      output: 'output "x" { value = length(var.list) != 0 }',
      errors: [{ messageId: 'emptyListEquality' }],
    },
    {
      code: 'output "x" { value = [] == var.list }',
      output: 'output "x" { value = length(var.list) == 0 }',
      errors: [{ messageId: 'emptyListEquality' }],
    },
    {
      code: 'resource "aws_instance" "web" { count = var.list == [] ? 0 : 1 }',
      output:
        'resource "aws_instance" "web" { count = length(var.list) == 0 ? 0 : 1 }',
      errors: [{ messageId: 'emptyListEquality' }],
    },
    {
      code: 'output "x" { value = [] != var.list }',
      output: 'output "x" { value = length(var.list) != 0 }',
      errors: [{ messageId: 'emptyListEquality' }],
    },
    {
      code: 'output "x" { value = var.map["key"] == [] }',
      output: 'output "x" { value = length(var.map["key"]) == 0 }',
      errors: [{ messageId: 'emptyListEquality' }],
    },
    {
      code: 'output "x" { value = [] == [] }',
      output: null,
      errors: [{ messageId: 'emptyListEquality' }],
    },
  ],
});
