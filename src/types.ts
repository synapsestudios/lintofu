import type { RuleDefinition } from "@eslint/core";
import type {
	Attribute,
	Block,
	Body,
	Expression,
	Traverser,
} from "./parser/types.js";
import type { LintofuRuleDocs } from "./rules/types.js";
import type { OpenTofuSourceCode, TofuNode } from "./source-code.js";

export type {
	Attribute,
	Block,
	Body,
	Expression,
	LiteralValueExpr,
	ObjectConsExpr,
	ObjectConsItem,
	ObjectConsKeyExpr,
	Range,
	ScopeTraversalExpr,
	TemplateExpr,
	TemplateWrapExpr,
	TraverseAttr,
	Traverser,
	TraverseRoot,
	UnknownExpr,
} from "./parser/types.js";
export type { ProjectIndex, ResourceAddress } from "./project-index.js";
export type { LintofuRuleDocs } from "./rules/types.js";
export type { OpenTofuSourceCode, TofuParserServices } from "./source-code.js";

// Discriminated union of every AST node a visitor can land on. Mirrors the
// nodes yielded by OpenTofuSourceCode.traverse(); ObjectConsItem is omitted
// because it has no `type` field and is descended into out-of-band.
type TofuVisitableNode = Body | Block | Attribute | Expression | Traverser;

export type OpenTofuRuleVisitor = {
	[N in TofuVisitableNode as N["type"]]?: (node: N) => void;
};

export type OpenTofuRuleDefinition<
	Options extends { RuleOptions?: unknown[]; MessageIds?: string } = {},
> = RuleDefinition<{
	LangOptions: Record<string, unknown>;
	Code: OpenTofuSourceCode;
	Visitor: OpenTofuRuleVisitor;
	Node: TofuNode;
	RuleOptions: Options["RuleOptions"] extends unknown[]
		? Options["RuleOptions"]
		: [];
	MessageIds: Options["MessageIds"] extends string
		? Options["MessageIds"]
		: string;
	ExtRuleDocs: LintofuRuleDocs;
}>;
