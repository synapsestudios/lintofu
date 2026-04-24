import type { RuleDefinition } from "@eslint/core";
import type { Block } from "../../parser/types.js";
import type { OpenTofuSourceCode, TofuNode } from "../../source-code.js";
import type { LintofuRuleDocs } from "../types.js";
import { checkDescription } from "../utils.js";

type Rule = RuleDefinition<{
	LangOptions: Record<string, unknown>;
	Code: OpenTofuSourceCode;
	RuleOptions: [];
	Visitor: {
		Block?(node: Block): void;
	};
	Node: TofuNode;
	MessageIds: "missingDescription";
	ExtRuleDocs: LintofuRuleDocs;
}>;

const rule: Rule = {
	meta: {
		type: "problem",
		docs: {
			description: "Require every `variable` block to have a `description`.",
			recommended: true,
			severity: "error",
		},
		messages: {
			missingDescription:
				"Variable `{{name}}` is missing a `description` attribute.",
		},
		schema: [],
	},
	create(context) {
		return {
			Block(node) {
				if (node.kind !== "variable") return;
				const label = node.labels[0] ?? "<unnamed>";
				const check = checkDescription(node);
				if (check.status === "missing") {
					context.report({
						node,
						messageId: "missingDescription",
						data: { name: label },
					});
				} else if (check.status === "empty") {
					context.report({
						node: check.attr,
						messageId: "missingDescription",
						data: { name: label },
					});
				}
			},
		};
	},
};

export default rule;
