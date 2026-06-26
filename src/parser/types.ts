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

export type Traverser = TraverseRoot | TraverseAttr;

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

export interface ParseResult {
  ast: Body;
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
  | 'UnknownExpr'
  | 'TraverseRoot'
  | 'TraverseAttr';
