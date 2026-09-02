import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './access-rule-country-block-requires-enterprise.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

const countryBlock = [
  'resource "cloudflare_access_rule" "block_ru" {',
  '  zone_id = var.zone_id',
  '  mode    = "block"',
  '  configuration = {',
  '    target = "country"',
  '    value  = "RU"',
  '  }',
  '}',
].join('\n');

function onPlan(plan: unknown) {
  return { lintofu: { cloudflare: { plan } } };
}

tester.run('access-rule-country-block-requires-enterprise', rule, {
  valid: [],
  invalid: [
    {
      code: countryBlock,
      settings: onPlan('business'),
      errors: [
        {
          messageId: 'countryBlockRequiresEnterprise',
          data: { plan: 'business' },
        },
      ],
    },
  ],
});
