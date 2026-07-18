import type { Plugin } from '@eslint/core';
import { buildCategoryRecommendedRules } from './configs/category-recommended.js';
import { buildRecommendedRules } from './configs/recommended.js';
import { OpenTofuLanguage } from './language.js';
import { initialize } from './parser/index.js';
import { rules } from './rules/index.js';

// ESLint's Language.parse contract is sync; this top-level await blocks
// the plugin export until the WASM parser is ready. ESLint's config loader
// uses dynamic import which awaits TLA, so consumers don't see the boot.
await initialize();

/**
 * the lintofu eslint plugin: `meta`, the `lintofu/opentofu` language,
 * every bundled rule, and the generated `recommended` and
 * `aws/recommended` configs.
 */
const plugin = {
  /** plugin name and version eslint reports. */
  meta: {
    name: 'lintofu',
    version: '0.0.0',
  },
  /**
   * the opentofu/terraform hcl language implementation; select it with
   * `language: 'lintofu/opentofu'`.
   */
  languages: {
    opentofu: new OpenTofuLanguage(),
  },
  /** every bundled rule, keyed by rule name. */
  rules,
  configs: {
    /**
     * every rule with `recommended: true`, at its declared severity
     * (error when the rule omits one). preconfigured for `.tf` and
     * `.tofu` files.
     */
    recommended: {
      plugins: {} as Record<string, Plugin>,
      files: ['**/*.tf', '**/*.tofu'],
      language: 'lintofu/opentofu',
      rules: buildRecommendedRules(rules),
    },
    /**
     * the recommended rules whose category is `aws`. same file coverage
     * as `recommended`.
     */
    'aws/recommended': {
      plugins: {} as Record<string, Plugin>,
      files: ['**/*.tf', '**/*.tofu'],
      language: 'lintofu/opentofu',
      rules: buildCategoryRecommendedRules(rules, 'aws'),
    },
  },
};

plugin.configs.recommended.plugins = { lintofu: plugin };
plugin.configs['aws/recommended'].plugins = { lintofu: plugin };

export default plugin;
export { OpenTofuLanguage } from './language.js';
export * from './types.js';
