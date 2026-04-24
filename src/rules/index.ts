import documentedOutputs from "./documented-outputs.js";
import documentedVariables from "./documented-variables.js";
import moduleSourcePinned from "./module-source-pinned.js";
import preferBareExpression from "./prefer-bare-expression.js";
import requiredProvidersPinned from "./required-providers-pinned.js";

export const rules = {
	"documented-variables": documentedVariables,
	"documented-outputs": documentedOutputs,
	"required-providers-pinned": requiredProvidersPinned,
	"module-source-pinned": moduleSourcePinned,
	"prefer-bare-expression": preferBareExpression,
};
