import noAuroraPinnedMinorWithAutoUpgrade from './aws/no-aurora-pinned-minor-with-auto-upgrade.js';
import noLegacySecurityGroupRules from './aws/no-legacy-security-group-rules.js';
import noMixedSecurityGroupRuleForms from './aws/no-mixed-security-group-rule-forms.js';
import noPinnedMinorWithAutoUpgrade from './aws/no-pinned-minor-with-auto-upgrade.js';
import documentedOutputs from './core/documented-outputs.js';
import documentedVariables from './core/documented-variables.js';
import moduleSourcePinned from './core/module-source-pinned.js';
import noExternalRefsInDestroyProvisioner from './core/no-external-refs-in-destroy-provisioner.js';
import noLegacyCountAttribute from './core/no-legacy-count-attribute.js';
import noLegacyProviderProxy from './core/no-legacy-provider-proxy.js';
import noReservedVariableNames from './core/no-reserved-variable-names.js';
import noTemplateProvider from './core/no-template-provider.js';
import noTerraformEnvReference from './core/no-terraform-env-reference.js';
import preferBareExpression from './core/prefer-bare-expression.js';
import providerSourceRequired from './core/provider-source-required.js';
import requiredProvidersPinned from './core/required-providers-pinned.js';

export const rules = {
  'documented-variables': documentedVariables,
  'no-reserved-variable-names': noReservedVariableNames,
  'documented-outputs': documentedOutputs,
  'required-providers-pinned': requiredProvidersPinned,
  'provider-source-required': providerSourceRequired,
  'module-source-pinned': moduleSourcePinned,
  'prefer-bare-expression': preferBareExpression,
  'no-legacy-provider-proxy': noLegacyProviderProxy,
  'no-template-provider': noTemplateProvider,
  'no-terraform-env-reference': noTerraformEnvReference,
  'no-external-refs-in-destroy-provisioner': noExternalRefsInDestroyProvisioner,
  'no-legacy-count-attribute': noLegacyCountAttribute,
  'no-legacy-security-group-rules': noLegacySecurityGroupRules,
  'no-mixed-security-group-rule-forms': noMixedSecurityGroupRuleForms,
  'no-pinned-minor-with-auto-upgrade': noPinnedMinorWithAutoUpgrade,
  'no-aurora-pinned-minor-with-auto-upgrade':
    noAuroraPinnedMinorWithAutoUpgrade,
};
