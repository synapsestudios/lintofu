import noLegacySecurityGroupRules from './aws/no-legacy-security-group-rules.js';
import noMixedSecurityGroupRuleForms from './aws/no-mixed-security-group-rule-forms.js';
import documentedOutputs from './core/documented-outputs.js';
import documentedVariables from './core/documented-variables.js';
import moduleSourcePinned from './core/module-source-pinned.js';
import noLegacyProviderProxy from './core/no-legacy-provider-proxy.js';
import noTemplateProvider from './core/no-template-provider.js';
import preferBareExpression from './core/prefer-bare-expression.js';
import requiredProvidersPinned from './core/required-providers-pinned.js';

export const rules = {
  'documented-variables': documentedVariables,
  'documented-outputs': documentedOutputs,
  'required-providers-pinned': requiredProvidersPinned,
  'module-source-pinned': moduleSourcePinned,
  'prefer-bare-expression': preferBareExpression,
  'no-legacy-provider-proxy': noLegacyProviderProxy,
  'no-template-provider': noTemplateProvider,
  'no-legacy-security-group-rules': noLegacySecurityGroupRules,
  'no-mixed-security-group-rule-forms': noMixedSecurityGroupRuleForms,
};
