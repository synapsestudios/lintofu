import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-bool-as-count.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-bool-as-count', rule, {
  valid: [
    { code: 'resource "a" "b" { count = 0 }' },
    { code: 'resource "a" "b" { count = 2 }' },
    { code: 'resource "a" "b" { count = var.enabled ? 1 : 0 }' },
    { code: 'resource "a" "b" { count = length(var.items) }' },
    { code: 'resource "a" "b" { count = var.enabled }' },
    { code: 'resource "a" "b" { count = var.instances + 1 }' },
    { code: 'resource "a" "b" { enabled = true }' },
    { code: 'variable "count" { default = true }' },
    { code: 'data "a" "b" { count = length(var.items) }' },
    { code: 'module "b" { count = var.count }' },
  ],
  invalid: [
    {
      code: 'resource "a" "b" { count = true }',
      output: 'resource "a" "b" { count = 1 }',
      errors: [{ messageId: 'boolAsCount' }],
    },
    {
      code: 'resource "a" "b" { count = false }',
      output: 'resource "a" "b" { count = 0 }',
      errors: [{ messageId: 'boolAsCount' }],
    },
    {
      code: 'resource "a" "b" { count = var.x == "y" }',
      output: 'resource "a" "b" { count = (var.x == "y") ? 1 : 0 }',
      errors: [{ messageId: 'boolAsCount' }],
    },
    {
      code: 'resource "a" "b" { count = !var.enabled }',
      output: 'resource "a" "b" { count = (!var.enabled) ? 1 : 0 }',
      errors: [{ messageId: 'boolAsCount' }],
    },
    {
      code: 'resource "a" "b" { count = var.a && var.b }',
      output: 'resource "a" "b" { count = (var.a && var.b) ? 1 : 0 }',
      errors: [{ messageId: 'boolAsCount' }],
    },
    {
      code: 'resource "a" "b" { count = var.n > 3 }',
      output: 'resource "a" "b" { count = (var.n > 3) ? 1 : 0 }',
      errors: [{ messageId: 'boolAsCount' }],
    },
    {
      code: 'data "a" "b" { count = true }',
      output: 'data "a" "b" { count = 1 }',
      errors: [{ messageId: 'boolAsCount' }],
    },
    {
      code: 'module "b" { count = false }',
      output: 'module "b" { count = 0 }',
      errors: [{ messageId: 'boolAsCount' }],
    },
  ],
});
