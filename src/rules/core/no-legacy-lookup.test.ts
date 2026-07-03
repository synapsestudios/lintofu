import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-legacy-lookup.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-legacy-lookup', rule, {
  valid: [
    { code: 'output "x" { value = lookup(var.m, "k", "default") }' },
    { code: 'output "x" { value = lookup(var.pair...) }' },
    { code: 'output "x" { value = lookup(var.m, var.keys...) }' },
    { code: 'output "x" { value = provider::foo::lookup(a, b) }' },
    { code: 'output "x" { value = coalesce(var.a, var.b) }' },
    { code: 'output "x" { value = var.tags["Name"] }' },
  ],
  invalid: [
    {
      code: 'output "x" { value = lookup(var.tags, "Name") }',
      output: 'output "x" { value = var.tags["Name"] }',
      errors: [{ messageId: 'legacyLookup' }],
    },
    {
      code: 'output "x" { value = "${lookup(var.tags, "Name")}" }',
      output: 'output "x" { value = "${var.tags["Name"]}" }',
      errors: [{ messageId: 'legacyLookup' }],
    },
    {
      code: 'output "x" { value = lookup(var.m, local.key) }',
      output: 'output "x" { value = var.m[local.key] }',
      errors: [{ messageId: 'legacyLookup' }],
    },
    {
      code: 'output "x" { value = [lookup(var.m, "a")] }',
      output: 'output "x" { value = [var.m["a"]] }',
      errors: [{ messageId: 'legacyLookup' }],
    },
    {
      code: 'output "x" { value = lookup(local.on ? local.a : local.b, "k") }',
      output: 'output "x" { value = (local.on ? local.a : local.b)["k"] }',
      errors: [{ messageId: 'legacyLookup' }],
    },
    {
      code: 'output "x" { value = lookup(var.a + var.b, "k") }',
      output: 'output "x" { value = (var.a + var.b)["k"] }',
      errors: [{ messageId: 'legacyLookup' }],
    },
  ],
});
