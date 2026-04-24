import type { RuleDefinition } from "@eslint/core";
import type { Block, ObjectConsExpr } from "../../parser/types.js";
import type { OpenTofuSourceCode, TofuNode } from "../../source-code.js";
import type { LintofuRuleDocs } from "../types.js";
import { objectItemKeyName } from "../utils.js";

type Rule = RuleDefinition<{
	LangOptions: Record<string, unknown>;
	Code: OpenTofuSourceCode;
	RuleOptions: [];
	Visitor: {
		Block?(node: Block): void;
	};
	Node: TofuNode;
	MessageIds: "unpinnedProvider";
	ExtRuleDocs: LintofuRuleDocs;
}>;

const rule: Rule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Require every provider in `terraform.required_providers` to declare a `version` constraint.",
			recommended: true,
			severity: "error",
		},
		messages: {
			unpinnedProvider:
				"Provider `{{name}}` has no `version` constraint; pin it to avoid breaking changes on upgrade.",
		},
		schema: [],
	},
	create(context) {
		return {
			Block(node) {
				if (node.kind !== "terraform") return;
				const requiredProviders = node.body.blocks.find(
					(b) => b.kind === "required_providers",
				);
				if (!requiredProviders) return;
				for (const attr of requiredProviders.body.attributes) {
					if (attr.expression.type !== "ObjectConsExpr") continue;
					const obj = attr.expression as ObjectConsExpr;
					const hasVersion = obj.items.some(
						(item) => objectItemKeyName(item) === "version",
					);
					if (!hasVersion) {
						context.report({
							node: attr,
							messageId: "unpinnedProvider",
							data: { name: attr.name },
						});
					}
				}
			},
		};
	},
};

export default rule;
