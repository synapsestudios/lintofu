import { describe, expect, it } from 'vitest';
import { rules } from '../rules/index.js';
import { buildRecommendedRules } from './recommended.js';

describe('recommended config, derived from real rule metadata', () => {
  it('includes every current rule with the expected severity', () => {
    expect(buildRecommendedRules(rules)).toEqual({
      'lintofu/documented-variables': 'error',
      'lintofu/documented-outputs': 'error',
      'lintofu/required-providers-pinned': 'error',
      'lintofu/module-source-pinned': 'error',
      'lintofu/prefer-bare-expression': 'warn',
      'lintofu/no-legacy-provider-proxy': 'error',
      'lintofu/no-template-provider': 'error',
      'lintofu/no-external-refs-in-destroy-provisioner': 'error',
      'lintofu/no-legacy-security-group-rules': 'error',
      'lintofu/no-mixed-security-group-rule-forms': 'warn',
    });
  });
});
