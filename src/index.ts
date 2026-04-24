import { buildRecommendedRules } from "./configs/recommended.js";
import { OpenTofuLanguage } from "./language.js";
import { initialize } from "./parser/index.js";
import { rules } from "./rules/index.js";

// ESLint's Language.parse contract is sync; this top-level await blocks
// the plugin export until the WASM parser is ready. ESLint's config loader
// uses dynamic import which awaits TLA, so consumers don't see the boot.
await initialize();

const plugin = {
	meta: {
		name: "lintofu",
		version: "0.0.0",
	},
	languages: {
		opentofu: new OpenTofuLanguage(),
	},
	rules,
	configs: {
		recommended: {
			plugins: {} as Record<string, unknown>,
			files: ["**/*.tf", "**/*.tofu"],
			language: "lintofu/opentofu",
			rules: buildRecommendedRules(rules),
		},
	},
};

plugin.configs.recommended.plugins = { lintofu: plugin };

export default plugin;
export { OpenTofuLanguage } from "./language.js";
export type { OpenTofuSourceCode } from "./source-code.js";
