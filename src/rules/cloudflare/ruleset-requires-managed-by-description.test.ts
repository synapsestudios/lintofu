import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './ruleset-requires-managed-by-description.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

function ruleset(...lines: string[]) {
  return [
    'resource "cloudflare_ruleset" "r" {',
    '  zone_id = var.zone_id',
    ...lines.map((line) => `  ${line}`),
    '}',
  ].join('\n');
}

tester.run('ruleset-requires-managed-by-description', rule, {
  valid: [
    ruleset('description = "Managed by terraform"'),
    ruleset('description = var.description'),
    ruleset('description = "Managed by ${var.tool}"'),
    ruleset('description = local.managed ? "a" : "b"'),
    [
      'resource "cloudflare_ruleset" "r" {',
      '  kind        = "managed"',
      '  description = "Cloudflare Managed Ruleset"',
      '}',
    ].join('\n'),
    'data "cloudflare_ruleset" "r" {\n  zone_id = var.zone_id\n}',
    'resource "cloudflare_dns_record" "r" {\n  zone_id = var.zone_id\n}',
    {
      code: ruleset('description = "Owned by platform"'),
      options: [{ description: 'Owned by platform' }],
    },
  ],
  invalid: [
    {
      code: ruleset(),
      errors: [
        {
          messageId: 'missingDescription',
          data: { description: 'Managed by terraform' },
          line: 1,
        },
      ],
    },
    {
      code: ruleset('description = "Blocks bots"'),
      errors: [{ messageId: 'missingDescription', line: 3, column: 3 }],
    },
    {
      code: ruleset('description = "managed by terraform"'),
      errors: [{ messageId: 'missingDescription', line: 3 }],
    },
    {
      code: ruleset(
        'rules = [{',
        '  action      = "block"',
        '  description = "Managed by terraform"',
        '  expression  = "true"',
        '}]',
      ),
      errors: [{ messageId: 'missingDescription', line: 1 }],
    },
    {
      code: ruleset('kind = var.kind'),
      errors: [{ messageId: 'missingDescription', line: 1 }],
    },
    {
      code: ruleset('description = "Managed by terraform"'),
      options: [{ description: 'Owned by platform' }],
      errors: [
        {
          messageId: 'missingDescription',
          data: { description: 'Owned by platform' },
          line: 3,
        },
      ],
    },
  ],
});
