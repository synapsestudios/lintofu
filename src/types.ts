import type { RuleDefinition } from '@eslint/core';
import type {
  Attribute,
  Block,
  Body,
  Expression,
  Traverser,
} from './parser/types.js';
import type { LintofuRuleDocs } from './rules/types.js';
import type { OpenTofuSourceCode, TofuNode } from './source-code.js';

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
} from './parser/types.js';
export type { ProjectIndex, ResourceAddress } from './project-index.js';
export type { LintofuRuleDocs } from './rules/types.js';
export type { OpenTofuSourceCode, TofuParserServices } from './source-code.js';

type TofuVisitableNode = Body | Block | Attribute | Expression | Traverser;

/**
 * the visitor object a rule's `create` returns. keys are node type names,
 * values are visit functions typed to the narrowed node. covers every node
 * {@link OpenTofuSourceCode.traverse} yields; there is no `ObjectConsItem`
 * key because ObjectConsItem has no `type` field, so traverse() descends
 * into its `keyExpr`/`valueExpr` out-of-band instead of yielding the item.
 *
 * @example
 * ```ts
 * const visitor: OpenTofuRuleVisitor = {
 *   Block(node) {
 *     console.log(node.kind, node.labels);
 *   },
 * };
 * ```
 */
export type OpenTofuRuleVisitor = {
  [N in TofuVisitableNode as N['type']]?: (node: N) => void;
};

/**
 * the shape of a lintofu rule. pins `context.sourceCode` to
 * {@link OpenTofuSourceCode}, docs metadata to {@link LintofuRuleDocs}, the
 * visitor to {@link OpenTofuRuleVisitor}, and the node type to TofuNode
 * (not a root export; rules meet it only through this definition). the
 * `Options` generic carries `RuleOptions` and `MessageIds`.
 *
 * @example
 * ```ts
 * const rule: OpenTofuRuleDefinition = {
 *   meta: {
 *     docs: { description: 'disallow foo blocks', recommended: true },
 *     messages: { noFoo: 'no foo blocks' },
 *   },
 *   create(context) {
 *     return {
 *       Block(node) {
 *         if (node.kind === 'foo') {
 *           context.report({ node, messageId: 'noFoo' });
 *         }
 *       },
 *     };
 *   },
 * };
 * ```
 */
export type OpenTofuRuleDefinition<
  Options extends {
    RuleOptions?: unknown[];
    MessageIds?: string;
  } = Record<string, never>,
> = RuleDefinition<{
  LangOptions: Record<string, unknown>;
  Code: OpenTofuSourceCode;
  Visitor: OpenTofuRuleVisitor;
  Node: TofuNode;
  RuleOptions: Options['RuleOptions'] extends unknown[]
    ? Options['RuleOptions']
    : [];
  MessageIds: Options['MessageIds'] extends string
    ? Options['MessageIds']
    : string;
  ExtRuleDocs: LintofuRuleDocs;
}>;
