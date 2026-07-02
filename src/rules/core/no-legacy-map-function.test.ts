import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-legacy-map-function.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-legacy-map-function', rule, {
  valid: [
    { code: 'output "x" { value = { a = 1, b = 2 } }' },
    { code: 'output "x" { value = tomap({ a = 1 }) }' },
    { code: 'output "x" { value = merge(var.a, var.b) }' },
    { code: 'output "x" { value = zipmap(["a"], [1]) }' },
    { code: 'output "x" { value = lookup(var.m, "k", "d") }' },
    { code: 'output "x" { value = local.map }' },
    { code: 'output "x" { value = var.mapping }' },
    { code: 'resource "aws_s3_bucket" "b" { map = "v" }' },
    { code: 'output "x" { value = mapfunc("a", 1) }' },
    { code: 'variable "x" { type = map(string) }' },
    { code: 'variable "x" { type = object({ tags = map(string) }) }' },
  ],
  invalid: [
    {
      code: 'output "x" { value = map("a", 1, "b", 2) }',
      output: 'output "x" { value = { a = 1, b = 2 } }',
      errors: [{ messageId: 'legacyMapFunction' }],
    },
    {
      code: 'output "x" { value = map("a", 1) }',
      output: 'output "x" { value = { a = 1 } }',
      errors: [{ messageId: 'legacyMapFunction' }],
    },
    {
      code: 'output "x" { value = map("region", var.region) }',
      output: 'output "x" { value = { region = var.region } }',
      errors: [{ messageId: 'legacyMapFunction' }],
    },
    {
      code: 'output "x" { value = map("a-b", 1) }',
      output: 'output "x" { value = { "a-b" = 1 } }',
      errors: [{ messageId: 'legacyMapFunction' }],
    },
    {
      code: 'resource "aws_s3_bucket" "b" { tags = map("Name", "app") }',
      output: 'resource "aws_s3_bucket" "b" { tags = { Name = "app" } }',
      errors: [{ messageId: 'legacyMapFunction' }],
    },
    {
      code: 'output "x" { value = map() }',
      output: 'output "x" { value = {} }',
      errors: [{ messageId: 'legacyMapFunction' }],
    },
    {
      code: 'output "x" { value = map("a", 1, "b") }',
      output: null,
      errors: [{ messageId: 'legacyMapFunction' }],
    },
    {
      code: 'output "x" { value = map(var.k, 1) }',
      output: null,
      errors: [{ messageId: 'legacyMapFunction' }],
    },
    {
      code: 'output "x" { value = map(pairs...) }',
      output: null,
      errors: [{ messageId: 'legacyMapFunction' }],
    },
    {
      code: 'output "x" { value = map("a", 1, "a", 2) }',
      output: null,
      errors: [{ messageId: 'legacyMapFunction' }],
    },
  ],
});
