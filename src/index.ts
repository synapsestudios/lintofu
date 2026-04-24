import { OpenTofuLanguage } from "./language.js";
import { initialize } from "./parser/index.js";
import documentedOutputs from "./rules/documented-outputs.js";
import documentedVariables from "./rules/documented-variables.js";
import moduleSourcePinned from "./rules/module-source-pinned.js";
import preferBareExpression from "./rules/prefer-bare-expression.js";
import requiredProvidersPinned from "./rules/required-providers-pinned.js";

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
	rules: {
		"documented-variables": documentedVariables,
		"documented-outputs": documentedOutputs,
		"required-providers-pinned": requiredProvidersPinned,
		"module-source-pinned": moduleSourcePinned,
		"prefer-bare-expression": preferBareExpression,
	},
	configs: {
		recommended: {
			plugins: {} as Record<string, unknown>,
			files: ["**/*.tf", "**/*.tofu"],
			language: "lintofu/opentofu",
			rules: {
				"lintofu/documented-variables": "error",
				"lintofu/documented-outputs": "error",
				"lintofu/required-providers-pinned": "error",
				"lintofu/module-source-pinned": "error",
				"lintofu/prefer-bare-expression": "warn",
			},
		},
	},
};

plugin.configs.recommended.plugins = { lintofu: plugin };

export default plugin;
export { OpenTofuLanguage } from "./language.js";
export type { OpenTofuSourceCode } from "./source-code.js";
