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

const TOFU_FILES = ['**/*.tf', '**/*.tofu'];

const PROVIDER_CATEGORIES = ['aws', 'cloudflare'] as const;

type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];

interface TierConfig {
  plugins: Record<string, Plugin>;
  files: string[];
  language: string;
  rules: Record<string, 'error' | 'warn'>;
}

function tierConfig(tierRules: Record<string, 'error' | 'warn'>): TierConfig {
  return {
    plugins: {},
    files: TOFU_FILES,
    language: 'lintofu/opentofu',
    rules: tierRules,
  };
}

const providerConfigs = Object.fromEntries(
  PROVIDER_CATEGORIES.map((category) => [
    `${category}/recommended`,
    tierConfig(buildCategoryRecommendedRules(rules, category)),
  ]),
) as Record<`${ProviderCategory}/recommended`, TierConfig>;

/**
 * the lintofu eslint plugin: `meta`, the `lintofu/opentofu` language,
 * every bundled rule, and the generated `recommended` and
 * `<provider>/recommended` configs.
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
    recommended: tierConfig(buildRecommendedRules(rules)),
    /**
     * one `<provider>/recommended` config per provider category, holding
     * the recommended rules of that category. same file coverage as
     * `recommended`.
     */
    ...providerConfigs,
  },
};

for (const config of Object.values(plugin.configs)) {
  config.plugins = { lintofu: plugin };
}

export default plugin;
export { OpenTofuLanguage } from './language.js';
export * from './types.js';
