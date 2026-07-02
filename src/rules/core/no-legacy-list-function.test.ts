import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-legacy-list-function.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-legacy-list-function', rule, {
  valid: [
    { code: 'output "x" { value = ["a", "b"] }' },
    { code: 'output "x" { value = [] }' },
    { code: 'output "x" { value = tolist(["a"]) }' },
    { code: 'output "x" { value = concat(["a"], ["b"]) }' },
    { code: 'output "x" { value = flatten([["a"]]) }' },
    { code: 'output "x" { value = coalescelist(var.a, var.b) }' },
    { code: 'output "x" { value = var.list }' },
    { code: 'output "x" { value = local.list_of_things }' },
    { code: 'output "x" { value = mylist("a") }' },
  ],
  invalid: [
    {
      code: 'output "x" { value = list("a", "b") }',
      output: 'output "x" { value = ["a", "b"] }',
      errors: [{ messageId: 'legacyListFunction' }],
    },
    {
      code: 'output "x" { value = list() }',
      output: 'output "x" { value = [] }',
      errors: [{ messageId: 'legacyListFunction' }],
    },
    {
      code: 'output "x" { value = list(var.a) }',
      output: 'output "x" { value = [var.a] }',
      errors: [{ messageId: 'legacyListFunction' }],
    },
    {
      code: 'output "x" { value = "${list("a")}" }',
      output: 'output "x" { value = "${["a"]}" }',
      errors: [{ messageId: 'legacyListFunction' }],
    },
    {
      code: 'output "x" { value = concat(list("a"), list("b")) }',
      output: 'output "x" { value = concat(["a"], ["b"]) }',
      errors: [
        { messageId: 'legacyListFunction' },
        { messageId: 'legacyListFunction' },
      ],
    },
  ],
});
