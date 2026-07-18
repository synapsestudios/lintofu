import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-duplicate-map-keys.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-duplicate-map-keys', rule, {
  valid: [
    { code: 'locals {\n  x = { a = 1, b = 2 }\n}' },
    { code: 'locals {\n  x = { a = 1 }\n}' },
    { code: 'locals {\n  x = {}\n}' },
    // Computed keys resolve at runtime, so a collision cannot be proven here.
    { code: 'locals {\n  m = { (local.k) = 1, (local.k) = 2 }\n}' },
    {
      code: 'locals {\n  m = { "${local.k}-${local.v}" = 1, "${local.k}-${local.v}" = 2 }\n}',
    },
    // Function-call and conditional keys are computed, so a collision cannot be proven here.
    { code: 'locals {\n  m = { (lower("A")) = 1, (lower("A")) = 2 }\n}' },
    {
      code: 'locals {\n  m = { (local.c ? "a" : "b") = 1, (local.c ? "a" : "b") = 2 }\n}',
    },
    // Same name at different nesting levels are independent scopes.
    { code: 'locals {\n  x = { a = { a = 1 }, b = 2 }\n}' },
  ],
  invalid: [
    {
      code: 'locals {\n  x = { a = 1, a = 2 }\n}',
      errors: [{ messageId: 'duplicateMapKey', data: { key: 'a' } }],
    },
    {
      code: 'locals {\n  x = { a = 1, "a" = 2 }\n}',
      errors: [{ messageId: 'duplicateMapKey', data: { key: 'a' } }],
    },
    {
      code: 'locals {\n  x = { a = 1, a = 2, a = 3 }\n}',
      errors: [
        { messageId: 'duplicateMapKey', data: { key: 'a' } },
        { messageId: 'duplicateMapKey', data: { key: 'a' } },
      ],
    },
    {
      code: 'locals {\n  x = { outer = { a = 1, a = 2 }, b = 2 }\n}',
      errors: [{ messageId: 'duplicateMapKey', data: { key: 'a' } }],
    },
  ],
});
