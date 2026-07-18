import { describe, expect, it } from 'vitest';
import plugin from '../index.js';

const v6RemovalRules = [
  'no-eip-vpc-attribute',
  'no-instance-cpu-count-attributes',
  'no-eks-addon-resolve-conflicts',
  'no-api-gateway-deployment-stage-args',
] as const;

describe('appliesTo rule metadata', () => {
  it('declares appliesTo on aws v6 removal rules', () => {
    for (const name of v6RemovalRules) {
      expect(plugin.rules[name].meta?.docs?.appliesTo, name).toEqual({
        aws: '>=6.0.0',
      });
    }
  });

  it('declares appliesTo on the aws v5 removal rule', () => {
    expect(
      plugin.rules['no-db-instance-name-attribute'].meta?.docs?.appliesTo,
    ).toEqual({ aws: '>=5.0.0' });
  });

  it('keeps appliesTo values as non-empty range strings', () => {
    for (const [name, rule] of Object.entries(plugin.rules)) {
      const appliesTo = rule.meta?.docs?.appliesTo;
      if (appliesTo === undefined) continue;
      for (const [key, range] of Object.entries(appliesTo)) {
        expect(key, name).not.toBe('');
        expect(range, name).toMatch(/^[><=~^]/);
      }
    }
  });
});
