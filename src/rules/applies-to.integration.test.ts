import { describe, expect, it } from 'vitest';
import { rules } from './index.js';

const v6RemovalRules = [
  'no-eip-vpc-attribute',
  'no-instance-cpu-count-attributes',
  'no-eks-addon-resolve-conflicts',
  'no-api-gateway-deployment-stage-args',
] as const;

const knownAppliesToKeys = ['aws', 'cloudflare', 'opentofu', 'terraform'];

describe('appliesTo rule metadata', () => {
  it('declares appliesTo on aws v6 removal rules', () => {
    for (const name of v6RemovalRules) {
      expect(rules[name].meta?.docs?.appliesTo, name).toEqual({
        aws: '>=6.0.0',
      });
    }
  });

  it('declares appliesTo on the aws v5 removal rule', () => {
    expect(
      rules['no-db-instance-name-attribute'].meta?.docs?.appliesTo,
    ).toEqual({ aws: '>=5.0.0' });
  });

  it('declares appliesTo on the cloudflare v5 attribute-form rule', () => {
    expect(
      rules['access-rule-country-block-requires-enterprise'].meta?.docs
        ?.appliesTo,
    ).toEqual({ cloudflare: '>=5.0.0' });
  });

  it('keeps appliesTo entries in the adr 0005 vocabulary', () => {
    for (const [name, rule] of Object.entries(rules)) {
      const appliesTo = rule.meta?.docs?.appliesTo;
      if (appliesTo === undefined) continue;
      for (const [key, range] of Object.entries(appliesTo)) {
        expect(knownAppliesToKeys, `${name}: unknown key ${key}`).toContain(
          key,
        );
        expect(range, name).toBeTypeOf('string');
        expect(range.length, name).toBeGreaterThan(0);
      }
    }
  });
});
