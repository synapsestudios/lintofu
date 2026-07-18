import { describe, expect, it } from 'vitest';
import { rules } from '../rules/index.js';
import { buildCategoryRecommendedRules } from './category-recommended.js';

describe('aws/recommended config, derived from real rule metadata', () => {
  it('includes every current aws rule with the expected severity', () => {
    expect(buildCategoryRecommendedRules(rules, 'aws')).toEqual({
      'lintofu/no-iam-role-inline-policies': 'warn',
      'lintofu/no-legacy-security-group-rules': 'error',
      'lintofu/no-iam-policy-attachment': 'warn',
      'lintofu/no-mixed-security-group-rule-forms': 'warn',
      'lintofu/no-pinned-minor-with-auto-upgrade': 'warn',
      'lintofu/no-aurora-pinned-minor-with-auto-upgrade': 'warn',
      'lintofu/no-eip-vpc-attribute': 'error',
      'lintofu/no-instance-cpu-count-attributes': 'error',
      'lintofu/no-s3-bucket-inline-config': 'warn',
      'lintofu/no-db-instance-name-attribute': 'error',
      'lintofu/no-eks-addon-resolve-conflicts': 'error',
    });
  });
});
