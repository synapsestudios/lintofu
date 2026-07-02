import { describe, expect, it } from 'vitest';
import { rules } from '../rules/index.js';
import { buildRecommendedRules } from './recommended.js';

describe('recommended config, derived from real rule metadata', () => {
  it('includes every current rule with the expected severity', () => {
    expect(buildRecommendedRules(rules)).toEqual({
      'lintofu/documented-variables': 'error',
      'lintofu/no-reserved-variable-names': 'error',
      'lintofu/documented-outputs': 'error',
      'lintofu/required-providers-pinned': 'error',
      'lintofu/provider-source-required': 'error',
      'lintofu/module-source-pinned': 'error',
      'lintofu/prefer-bare-expression': 'warn',
      'lintofu/no-legacy-map-function': 'error',
      'lintofu/no-legacy-provider-proxy': 'error',
      'lintofu/no-template-provider': 'error',
      'lintofu/no-terraform-env-reference': 'error',
      'lintofu/remote-state-outputs-prefix': 'error',
      'lintofu/no-external-refs-in-destroy-provisioner': 'error',
      'lintofu/no-legacy-ignore-changes-wildcard': 'error',
      'lintofu/no-legacy-security-group-rules': 'error',
      'lintofu/no-mixed-security-group-rule-forms': 'warn',
      'lintofu/no-pinned-minor-with-auto-upgrade': 'warn',
      'lintofu/no-aurora-pinned-minor-with-auto-upgrade': 'warn',
    });
  });
});
