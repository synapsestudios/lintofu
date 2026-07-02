import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-reserved-variable-names.js';

// RuleTester auto-detects mocha globals; without these it silently no-ops
// under vitest.
RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-reserved-variable-names', rule, {
  valid: [
    { code: 'variable "region" {}' },
    // Boundary near-misses: exact match only, so these are allowed.
    { code: 'variable "sources" {}' },
    { code: 'variable "for" {}' },
    { code: 'variable "Count" {}' },
    // Reserved words are only reserved as `variable` names; other block
    // kinds may use them as labels.
    { code: 'output "count" { value = 1 }' },
    { code: 'resource "aws_instance" "count" {}' },
  ],
  invalid: [
    {
      code: 'variable "source" {}',
      errors: [{ messageId: 'reservedName', data: { name: 'source' } }],
    },
    { code: 'variable "version" {}', errors: [{ messageId: 'reservedName' }] },
    {
      code: 'variable "providers" {}',
      errors: [{ messageId: 'reservedName' }],
    },
    { code: 'variable "count" {}', errors: [{ messageId: 'reservedName' }] },
    { code: 'variable "for_each" {}', errors: [{ messageId: 'reservedName' }] },
    {
      code: 'variable "lifecycle" {}',
      errors: [{ messageId: 'reservedName' }],
    },
    {
      code: 'variable "depends_on" {}',
      errors: [{ messageId: 'reservedName' }],
    },
    { code: 'variable "locals" {}', errors: [{ messageId: 'reservedName' }] },
    {
      // Each reserved block is reported independently.
      code: 'variable "count" {}\nvariable "source" {}',
      errors: [
        { messageId: 'reservedName', data: { name: 'count' } },
        { messageId: 'reservedName', data: { name: 'source' } },
      ],
    },
  ],
});
