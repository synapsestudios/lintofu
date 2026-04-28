// Asserts the consumer-facing surface resolves at the package root.
// Anything a downstream rule author plausibly needs must be importable
// from "lintofu" (which resolves to ./index.js inside the package).

import type {
  Attribute,
  Block,
  Body,
  Expression,
  LintofuRuleDocs,
  LiteralValueExpr,
  ObjectConsExpr,
  ObjectConsItem,
  ObjectConsKeyExpr,
  OpenTofuRuleDefinition,
  OpenTofuRuleVisitor,
  OpenTofuSourceCode,
  ProjectIndex,
  Range,
  ResourceAddress,
  ScopeTraversalExpr,
  TemplateExpr,
  TemplateWrapExpr,
  TofuParserServices,
  TraverseAttr,
  Traverser,
  TraverseRoot,
  UnknownExpr,
} from './index.js';

// Use one identifier from each to force resolution.
const _block: Block | undefined = undefined;
const _body: Body | undefined = undefined;
const _attribute: Attribute | undefined = undefined;
const _expression: Expression | undefined = undefined;
const _literal: LiteralValueExpr | undefined = undefined;
const _template: TemplateExpr | undefined = undefined;
const _wrap: TemplateWrapExpr | undefined = undefined;
const _scope: ScopeTraversalExpr | undefined = undefined;
const _traverser: Traverser | undefined = undefined;
const _root: TraverseRoot | undefined = undefined;
const _attr: TraverseAttr | undefined = undefined;
const _obj: ObjectConsExpr | undefined = undefined;
const _objItem: ObjectConsItem | undefined = undefined;
const _objKey: ObjectConsKeyExpr | undefined = undefined;
const _unknown: UnknownExpr | undefined = undefined;
const _range: Range | undefined = undefined;
const _services: TofuParserServices | undefined = undefined;
const _index: ProjectIndex | undefined = undefined;
const _addr: ResourceAddress | undefined = undefined;
const _docs: LintofuRuleDocs | undefined = undefined;
const _sc: OpenTofuSourceCode | undefined = undefined;
const _visitor: OpenTofuRuleVisitor | undefined = undefined;
const _rule: OpenTofuRuleDefinition | undefined = undefined;
