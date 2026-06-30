// Mirrors parser-go/parser/parser.go. Changes must stay in sync.

export interface Pos {
  /** 1-indexed. */
  line: number;
  /** 1-indexed byte offset within the line (NOT a character offset). */
  column: number;
  /** 0-indexed byte offset from BOF. */
  offset: number;
}

export interface Range {
  start: Pos;
  end: Pos;
}

export interface Body {
  type: 'Body';
  blocks: Block[];
  attributes: Attribute[];
  range: Range;
}

export interface Block {
  type: 'Block';
  kind: string;
  labels: string[];
  body: Body;
  range: Range;
}

export interface Attribute {
  type: 'Attribute';
  name: string;
  expression: Expression;
  range: Range;
}

export type Expression =
  | LiteralValueExpr
  | TemplateExpr
  | TemplateWrapExpr
  | FunctionCallExpr
  | ScopeTraversalExpr
  | ObjectConsExpr
  | ObjectConsKeyExpr
  | ConditionalExpr
  | ForExpr
  | SplatExpr
  | IndexExpr
  | UnknownExpr;

export interface LiteralValueExpr {
  type: 'LiteralValueExpr';
  value: string | number | boolean | null;
  range: Range;
}

export interface TemplateExpr {
  type: 'TemplateExpr';
  parts: Expression[];
  range: Range;
}

export interface FunctionCallExpr {
  type: 'FunctionCallExpr';
  name: string;
  args: Expression[];
  // HCL's `...` spread of the final argument, e.g. `concat(a, b...)`.
  expandFinal: boolean;
  range: Range;
}

// `"${expr}"` exactly: a single non-literal part with no surrounding text.
export interface TemplateWrapExpr {
  type: 'TemplateWrapExpr';
  wrapped: Expression;
  range: Range;
}

export interface ScopeTraversalExpr {
  type: 'ScopeTraversalExpr';
  traversal: Traverser[];
  range: Range;
}

export type Traverser = TraverseRoot | TraverseAttr | TraverseIndex;

export interface TraverseRoot {
  type: 'TraverseRoot';
  name: string;
  range: Range;
}

export interface TraverseAttr {
  type: 'TraverseAttr';
  name: string;
  range: Range;
}

export interface TraverseIndex {
  type: 'TraverseIndex';
  key: string | number | boolean | null;
  range: Range;
}

export interface ObjectConsExpr {
  type: 'ObjectConsExpr';
  items: ObjectConsItem[];
  range: Range;
}

// Has no `type` discriminator — handled specially in traverse().
export interface ObjectConsItem {
  keyExpr: Expression;
  valueExpr: Expression;
}

export interface ObjectConsKeyExpr {
  type: 'ObjectConsKeyExpr';
  wrapped: Expression;
  range: Range;
}

export interface ConditionalExpr {
  type: 'ConditionalExpr';
  condition: Expression;
  trueResult: Expression;
  falseResult: Expression;
  range: Range;
}

export interface ForExpr {
  type: 'ForExpr';
  keyVar: string;
  valVar: string;
  collExpr: Expression;
  keyExpr?: Expression;
  valExpr: Expression;
  condExpr?: Expression;
  group: boolean;
  range: Range;
}

export interface SplatExpr {
  type: 'SplatExpr';
  source: Expression;
  each: Expression;
  range: Range;
}

// `x[k]` where k is non-constant. A constant index folds into the enclosing
// ScopeTraversalExpr as a TraverseIndex step instead.
export interface IndexExpr {
  type: 'IndexExpr';
  collection: Expression;
  key: Expression;
  range: Range;
}

export interface UnknownExpr {
  type: 'UnknownExpr';
  unknownKind: string;
  range: Range;
}

export interface Diagnostic {
  severity: 'error' | 'warning';
  summary: string;
  detail?: string;
  range: Range;
}

// Not an AST node: comments travel on their own channel and are never added
// to NodeType, visitorKeys, or traverse(). Kind is 'line' (# or //) or
// 'block' (/* */).
export interface Comment {
  type: 'Comment';
  kind: 'line' | 'block';
  value: string;
  range: Range;
}

export interface ParseResult {
  ast: Body;
  comments: Comment[];
  diagnostics: Diagnostic[];
}

// Drives compile-time exhaustiveness on visitorKeys.
export type NodeType =
  | 'Body'
  | 'Block'
  | 'Attribute'
  | 'LiteralValueExpr'
  | 'TemplateExpr'
  | 'TemplateWrapExpr'
  | 'FunctionCallExpr'
  | 'ScopeTraversalExpr'
  | 'ObjectConsExpr'
  | 'ObjectConsKeyExpr'
  | 'ConditionalExpr'
  | 'ForExpr'
  | 'SplatExpr'
  | 'IndexExpr'
  | 'UnknownExpr'
  | 'TraverseRoot'
  | 'TraverseAttr'
  | 'TraverseIndex';
