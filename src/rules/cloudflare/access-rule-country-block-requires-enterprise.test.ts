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

function accessRule(mode: string, target: string, kind = 'resource') {
  return [
    `${kind} "cloudflare_access_rule" "r" {`,
    `  mode = ${mode}`,
    '  configuration = {',
    `    target = ${target}`,
    '    value  = "RU"',
    '  }',
    '}',
  ].join('\n');
}

function reportsOn(plan: string) {
  return {
    code: countryBlock,
    settings: onPlan(plan),
    errors: [{ messageId: 'countryBlockRequiresEnterprise', data: { plan } }],
  };
}

function quietOnBusiness(code: string) {
  return { code, settings: onPlan('business') };
}

tester.run('access-rule-country-block-requires-enterprise', rule, {
  valid: [
    { code: countryBlock, settings: onPlan('enterprise') },
    { code: countryBlock },
    { code: countryBlock, settings: { lintofu: {} } },
    { code: countryBlock, settings: { lintofu: { cloudflare: {} } } },
    quietOnBusiness(accessRule('"challenge"', '"country"')),
    quietOnBusiness(accessRule('"js_challenge"', '"country"')),
    quietOnBusiness(accessRule('"managed_challenge"', '"country"')),
    quietOnBusiness(accessRule('"whitelist"', '"country"')),
    quietOnBusiness(accessRule('"block"', '"ip"')),
    quietOnBusiness(accessRule('"block"', '"ip6"')),
    quietOnBusiness(accessRule('"block"', '"ip_range"')),
    quietOnBusiness(accessRule('"block"', '"asn"')),
    quietOnBusiness(accessRule('var.mode', '"country"')),
    quietOnBusiness(accessRule('"block"', 'var.target')),
    quietOnBusiness(
      accessRule('local.block ? "block" : "challenge"', '"country"'),
    ),
    quietOnBusiness(accessRule('"block"', '"country"', 'data')),
    quietOnBusiness(
      'resource "cloudflare_access_rule" "r" {\n  configuration = {\n    target = "country"\n  }\n}',
    ),
    quietOnBusiness(
      'resource "cloudflare_access_rule" "r" {\n  mode = "block"\n}',
    ),
    quietOnBusiness(
      'resource "cloudflare_access_rule" "r" {\n  mode = "block"\n  configuration = var.configuration\n}',
    ),
    quietOnBusiness(
      'resource "cloudflare_access_rule" "r" {\n  mode = "block"\n  configuration {\n    target = "country"\n    value  = "RU"\n  }\n}',
    ),
    quietOnBusiness(
      'resource "cloudflare_ruleset" "r" {\n  mode = "block"\n  configuration = {\n    target = "country"\n  }\n}',
    ),
  ],
  invalid: [
    reportsOn('business'),
    reportsOn('pro'),
    reportsOn('free'),
    {
      code: `${accessRule('"block"', '"country"')}\n\n${countryBlock}`,
      settings: onPlan('pro'),
      errors: [
        { messageId: 'countryBlockRequiresEnterprise', line: 1 },
        { messageId: 'countryBlockRequiresEnterprise', line: 9 },
      ],
    },
  ],
});
