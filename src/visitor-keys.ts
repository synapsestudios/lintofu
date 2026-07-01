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
  TupleConsExpr: ['exprs'],
  ConditionalExpr: ['condition', 'trueResult', 'falseResult'],
  ForExpr: ['collExpr', 'keyExpr', 'valExpr', 'condExpr'],
  SplatExpr: ['source', 'each'],
  IndexExpr: ['collection', 'key'],
  RelativeTraversalExpr: ['source'],
  ParenthesesExpr: ['expression'],
  BinaryOpExpr: ['lhs', 'rhs'],
  UnaryOpExpr: ['operand'],
  LiteralValueExpr: [],
  UnknownExpr: [],
  TraverseRoot: [],
  TraverseAttr: [],
  TraverseIndex: [],
};
