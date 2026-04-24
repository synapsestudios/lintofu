import type { RuleDefinition } from "@eslint/core";
import type {
	Block,
	Body,
	ScopeTraversalExpr,
} from "../../parser/types.js";
import type { OpenTofuSourceCode, TofuNode } from "../../source-code.js";
import type { LintofuRuleDocs } from "../types.js";

const STANDALONE_RULE_KINDS = new Set([
	"aws_vpc_security_group_ingress_rule",
	"aws_vpc_security_group_egress_rule",
	"aws_security_group_rule",
]);

type Rule = RuleDefinition<{
	LangOptions: Record<string, unknown>;
	Code: OpenTofuSourceCode;
	RuleOptions: [];
	Visitor: {
		Block?(node: Block): void;
	};
	Node: TofuNode;
	MessageIds: "mixedForms";
	ExtRuleDocs: LintofuRuleDocs;
}>;

const rule: Rule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Warn when a standalone security group rule targets an `aws_security_group` that also defines inline `ingress`/`egress` blocks, which causes drift.",
			recommended: true,
			severity: "warn",
			category: "aws",
		},
		messages: {
			mixedForms:
				"This rule is currently attached to a resource that defines either or both `ingress {}` or `egress {}` rule blocks, this will cause inconsistent state changes and appear as drift.",
		},
		schema: [],
	},
	create(context) {
		const sourceCode = context.sourceCode;
		return {
			Block(node) {
				if (node.kind !== "resource") return;
				const kindLabel = node.labels[0];
				if (!kindLabel || !STANDALONE_RULE_KINDS.has(kindLabel)) return;

				const sgIdAttr = node.body.attributes.find(
					(a) => a.name === "security_group_id",
				);
				if (!sgIdAttr) return;
				if (sgIdAttr.expression.type !== "ScopeTraversalExpr") return;

				const target = resolveSecurityGroup(sourceCode, sgIdAttr.expression);
				if (!target) return;
				if (!hasInlineRuleBlocks(target)) return;

				context.report({ node, messageId: "mixedForms" });
			},
		};
	},
};

export default rule;

function resolveSecurityGroup(
	sourceCode: OpenTofuSourceCode,
	expr: ScopeTraversalExpr,
): Block | undefined {
	// In-source definitions take precedence over the on-disk project index:
	// during linting the in-memory AST is authoritative for the current file.
	const addr = traversalHead(expr);
	if (addr) {
		const inSource = findBlock(sourceCode.ast, "resource", addr);
		if (inSource) return inSource;
	}
	return sourceCode.parserServices.projectIndex.resolveTraversal(expr);
}

function traversalHead(
	expr: ScopeTraversalExpr,
): readonly [string, string] | undefined {
	const [root, name] = expr.traversal;
	if (!root || root.type !== "TraverseRoot") return undefined;
	if (!name || name.type !== "TraverseAttr") return undefined;
	return [root.name, name.name];
}

function findBlock(
	body: Body,
	kind: string,
	labels: readonly [string, string],
): Block | undefined {
	return body.blocks.find(
		(b) =>
			b.kind === kind && b.labels[0] === labels[0] && b.labels[1] === labels[1],
	);
}

function hasInlineRuleBlocks(sg: Block): boolean {
	return sg.body.blocks.some(
		(b) => b.kind === "ingress" || b.kind === "egress",
	);
}
