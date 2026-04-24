import type { RuleDefinition } from "@eslint/core";
import type { TemplateWrapExpr } from "../parser/types.js";
import type { OpenTofuSourceCode, TofuNode } from "../source-code.js";

type Rule = RuleDefinition<{
	LangOptions: Record<string, unknown>;
	Code: OpenTofuSourceCode;
	RuleOptions: [];
	Visitor: {
		TemplateWrapExpr?(node: TemplateWrapExpr): void;
	};
	Node: TofuNode;
	MessageIds: "preferBareExpression";
	ExtRuleDocs: Record<string, unknown>;
}>;

const rule: Rule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				'Prefer the bare expression form over the redundant "${expr}" wrapping.',
		},
		messages: {
			preferBareExpression:
				'Unwrap this "${...}" expression and write it bare; the wrapper adds nothing.',
		},
		schema: [],
	},
	create(context) {
		return {
			TemplateWrapExpr(node) {
				context.report({ node, messageId: "preferBareExpression" });
			},
		};
	},
};

export default rule;
