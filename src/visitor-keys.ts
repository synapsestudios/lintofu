import type { NodeType } from './parser/types.js';

// The Record<NodeType, ...> constraint makes this exhaustive at compile
// time: adding to NodeType without an entry here is a type error.
// ObjectConsExpr lists "items" but those entries lack a `type` field;
// traverse() handles them out-of-band.
export const visitorKeys: Record<NodeType, readonly string[]> = {
  Body: ['blocks', 'attributes'],
  Block: ['body'],
  Attribute: ['expression'],
  TemplateExpr: ['parts'],
  TemplateWrapExpr: ['wrapped'],
  FunctionCallExpr: ['args'],
  ScopeTraversalExpr: ['traversal'],
  ObjectConsExpr: ['items'],
  ObjectConsKeyExpr: ['wrapped'],
  ConditionalExpr: ['condition', 'trueResult', 'falseResult'],
  ForExpr: ['collExpr', 'keyExpr', 'valExpr', 'condExpr'],
  LiteralValueExpr: [],
  UnknownExpr: [],
  TraverseRoot: [],
  TraverseAttr: [],
};
