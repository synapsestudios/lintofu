import noAuroraPinnedMinorWithAutoUpgrade from './aws/no-aurora-pinned-minor-with-auto-upgrade.js';
import noLegacySecurityGroupRules from './aws/no-legacy-security-group-rules.js';
import noMixedSecurityGroupRuleForms from './aws/no-mixed-security-group-rule-forms.js';
import noPinnedMinorWithAutoUpgrade from './aws/no-pinned-minor-with-auto-upgrade.js';
import documentedOutputs from './core/documented-outputs.js';
import documentedVariables from './core/documented-variables.js';
import moduleSourcePinned from './core/module-source-pinned.js';
import noBoolAsCount from './core/no-bool-as-count.js';
import noExternalRefsInDestroyProvisioner from './core/no-external-refs-in-destroy-provisioner.js';
import noLegacyCountAttribute from './core/no-legacy-count-attribute.js';
import noLegacyIgnoreChangesWildcard from './core/no-legacy-ignore-changes-wildcard.js';
import noLegacyListFunction from './core/no-legacy-list-function.js';
import noLegacyMapFunction from './core/no-legacy-map-function.js';
import noLegacyProviderProxy from './core/no-legacy-provider-proxy.js';
import noQuotedDependsOn from './core/no-quoted-depends-on.js';
import noQuotedTypeConstraints from './core/no-quoted-type-constraints.js';
import noReservedVariableNames from './core/no-reserved-variable-names.js';
import noSplatBracketIndex from './core/no-splat-bracket-index.js';
import noTemplateProvider from './core/no-template-provider.js';
import noTerraformEnvReference from './core/no-terraform-env-reference.js';
import preferBareExpression from './core/prefer-bare-expression.js';
import providerSourceRequired from './core/provider-source-required.js';
import remoteStateOutputsPrefix from './core/remote-state-outputs-prefix.js';
import requiredProvidersPinned from './core/required-providers-pinned.js';

export const rules = {
  'documented-variables': documentedVariables,
  'no-reserved-variable-names': noReservedVariableNames,
  'documented-outputs': documentedOutputs,
  'required-providers-pinned': requiredProvidersPinned,
  'provider-source-required': providerSourceRequired,
  'module-source-pinned': moduleSourcePinned,
  'prefer-bare-expression': preferBareExpression,
  'no-legacy-list-function': noLegacyListFunction,
  'no-legacy-map-function': noLegacyMapFunction,
  'no-bool-as-count': noBoolAsCount,
  'no-legacy-provider-proxy': noLegacyProviderProxy,
  'no-template-provider': noTemplateProvider,
  'no-terraform-env-reference': noTerraformEnvReference,
  'no-quoted-type-constraints': noQuotedTypeConstraints,
  'no-splat-bracket-index': noSplatBracketIndex,
  'remote-state-outputs-prefix': remoteStateOutputsPrefix,
  'no-external-refs-in-destroy-provisioner': noExternalRefsInDestroyProvisioner,
  'no-legacy-ignore-changes-wildcard': noLegacyIgnoreChangesWildcard,
  'no-legacy-count-attribute': noLegacyCountAttribute,
  'no-legacy-security-group-rules': noLegacySecurityGroupRules,
  'no-mixed-security-group-rule-forms': noMixedSecurityGroupRuleForms,
  'no-pinned-minor-with-auto-upgrade': noPinnedMinorWithAutoUpgrade,
  'no-aurora-pinned-minor-with-auto-upgrade':
    noAuroraPinnedMinorWithAutoUpgrade,
  'no-quoted-depends-on': noQuotedDependsOn,
};
