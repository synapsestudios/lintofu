// Mirrors parser-go/parser/parser.go. Changes must stay in sync.

/** A position in source. Byte-oriented, not character-oriented. */
export interface Pos {
  /** 1-indexed. */
  line: number;
  /** 1-indexed byte offset within the line (NOT a character offset). */
  column: number;
  /** 0-indexed byte offset from BOF. */
  offset: number;
}

/** Start and end positions of a node's source text. Every node carries one. */
export interface Range {
  start: Pos;
  end: Pos;
}

/**
 * Contents of a file or a block body. `blocks` and `attributes` are in
 * source order.
 */
export interface Body {
  type: 'Body';
  blocks: Block[];
  attributes: Attribute[];
  range: Range;
}

/**
 * An HCL block. `kind` is the block type as written (`resource`,
 * `variable`, ...), `labels` the quoted or bare labels, `body` the nested
 * body.
 */
export interface Block {
  type: 'Block';
  kind: string;
  labels: string[];
  body: Body;
  range: Range;
}

/** A `name = expression` assignment. */
export interface Attribute {
  type: 'Attribute';
  name: string;
  expression: Expression;
  range: Range;
}

/**
 * Discriminated union of every expression node; narrow on `type`. Several
 * variants (FunctionCallExpr, TupleConsExpr, ConditionalExpr, ForExpr,
 * SplatExpr, IndexExpr, RelativeTraversalExpr, ParenthesesExpr, BinaryOpExpr,
 * UnaryOpExpr) are not root exports and are reached only by narrowing this
 * union; their interface docs are what hover shows after narrowing.
 */
export type Expression =
  | LiteralValueExpr
  | TemplateExpr
  | TemplateWrapExpr
  | FunctionCallExpr
  | ScopeTraversalExpr
  | ObjectConsExpr
  | ObjectConsKeyExpr
  | TupleConsExpr
  | ConditionalExpr
  | ForExpr
  | SplatExpr
  | IndexExpr
  | RelativeTraversalExpr
  | ParenthesesExpr
  | BinaryOpExpr
  | UnaryOpExpr
  | UnknownExpr;

/** A constant scalar. `value` is a string, number, boolean, or null. */
export interface LiteralValueExpr {
  type: 'LiteralValueExpr';
  value: string | number | boolean | null;
  range: Range;
}

/**
 * A string template. `parts` interleaves literal and interpolated
 * expressions.
 */
export interface TemplateExpr {
  type: 'TemplateExpr';
  parts: Expression[];
  range: Range;
}

/** A function call like `concat(a, b)`. */
export interface FunctionCallExpr {
  type: 'FunctionCallExpr';
  name: string;
  args: Expression[];
  /** HCL's `...` spread of the final argument, e.g. `concat(a, b...)`. */
  expandFinal: boolean;
  range: Range;
}

/** `"${expr}"` exactly: a single non-literal part with no surrounding text. */
export interface TemplateWrapExpr {
  type: 'TemplateWrapExpr';
  wrapped: Expression;
  range: Range;
}

/**
 * A variable reference like `aws_instance.web.id`. `traversal` is the chain
 * of steps, starting with a {@link TraverseRoot}.
 */
export interface ScopeTraversalExpr {
  type: 'ScopeTraversalExpr';
  traversal: Traverser[];
  range: Range;
}

/**
 * Union of traversal steps; narrow on `type`. {@link TraverseIndex} is
 * reachable only through this union.
 */
export type Traverser = TraverseRoot | TraverseAttr | TraverseIndex;

/** First step of a traversal: the bare root symbol (`aws_instance`). */
export interface TraverseRoot {
  type: 'TraverseRoot';
  name: string;
  range: Range;
}

/** A `.name` step. */
export interface TraverseAttr {
  type: 'TraverseAttr';
  name: string;
  range: Range;
}

/** A constant `[key]` step folded into the traversal (see {@link IndexExpr}). */
export interface TraverseIndex {
  type: 'TraverseIndex';
  key: string | number | boolean | null;
  range: Range;
}

/** An object constructor `{ k = v, ... }`. */
export interface ObjectConsExpr {
  type: 'ObjectConsExpr';
  items: ObjectConsItem[];
  range: Range;
}

/**
 * One key/value pair of an {@link ObjectConsExpr}. Has no `type`
 * discriminator, so it is not a visitable node: OpenTofuSourceCode.traverse()
 * descends into `keyExpr` and `valueExpr` directly (out-of-band), and there
 * is no `ObjectConsItem` visitor key in OpenTofuRuleVisitor.
 */
export interface ObjectConsItem {
  keyExpr: Expression;
  valueExpr: Expression;
}

/** Wrapper HCL puts around object keys; unwrap via `wrapped`. */
export interface ObjectConsKeyExpr {
  type: 'ObjectConsKeyExpr';
  wrapped: Expression;
  range: Range;
}

/** A list constructor `[a, b, c]`. */
export interface TupleConsExpr {
  type: 'TupleConsExpr';
  exprs: Expression[];
  range: Range;
}

/** `cond ? a : b`. */
export interface ConditionalExpr {
  type: 'ConditionalExpr';
  condition: Expression;
  trueResult: Expression;
  falseResult: Expression;
  range: Range;
}

/**
 * A for expression. `keyVar` and `valVar` are the loop variable names,
 * `keyExpr` is present only for object results, `condExpr` is the optional
 * `if` filter, and `group` is true for `...` grouping.
 */
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

/** `list[*].attr` or `list.*.attr`: `source` plus the per-element `each`. */
export interface SplatExpr {
  type: 'SplatExpr';
  source: Expression;
  each: Expression;
  range: Range;
}

/**
 * `x[k]` where `k` is non-constant. A constant index folds into the enclosing
 * {@link ScopeTraversalExpr} as a {@link TraverseIndex} step instead.
 */
export interface IndexExpr {
  type: 'IndexExpr';
  collection: Expression;
  key: Expression;
  range: Range;
}

/**
 * A traversal chained onto a non-variable source: the `.id` in
 * `aws_instance.x[*].id` or the `.address` in `(var.x).address`. A traversal
 * rooted on a bare symbol folds into {@link ScopeTraversalExpr} instead.
 */
export interface RelativeTraversalExpr {
  type: 'RelativeTraversalExpr';
  source: Expression;
  traversal: Traverser[];
  range: Range;
}

/**
 * `(expr)`: explicit grouping parens, kept so a chained traversal or operator
 * has something to attach to.
 */
export interface ParenthesesExpr {
  type: 'ParenthesesExpr';
  expression: Expression;
  range: Range;
}

/** Operator names for {@link BinaryOpExpr}. */
export type BinaryOp =
  | 'equal'
  | 'notEqual'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'modulo'
  | 'logicalAnd'
  | 'logicalOr';

/** `a == b`, `a + b`, `a && b`. `op` is the operator's name, not its symbol. */
export interface BinaryOpExpr {
  type: 'BinaryOpExpr';
  op: BinaryOp;
  lhs: Expression;
  rhs: Expression;
  range: Range;
}

/** Operator names for {@link UnaryOpExpr}. */
export type UnaryOp = 'logicalNot' | 'negate';

/** `!x`, `-x`. `op` is the operator's name, not its symbol. */
export interface UnaryOpExpr {
  type: 'UnaryOpExpr';
  op: UnaryOp;
  operand: Expression;
  range: Range;
}

/**
 * Fallback for expression kinds the parser does not model yet. `unknownKind`
 * names the HCL syntax type.
 */
export interface UnknownExpr {
  type: 'UnknownExpr';
  unknownKind: string;
  range: Range;
}

/** A parse diagnostic from HCL; severity is error or warning. */
export interface Diagnostic {
  severity: 'error' | 'warning';
  summary: string;
  detail?: string;
  range: Range;
}

/**
 * Not an AST node: comments travel on their own channel
 * (OpenTofuSourceCode.comments) and are never added to {@link NodeType},
 * visitorKeys, or traverse(). `kind` is `'line'` (`#` or `//`) or `'block'`
 * (`/*` style).
 */
export interface Comment {
  type: 'Comment';
  kind: 'line' | 'block';
  value: string;
  range: Range;
}

/** What the parser returns: ast, comments, diagnostics. */
export interface ParseResult {
  ast: Body;
  comments: Comment[];
  diagnostics: Diagnostic[];
}

/**
 * Every visitable node type name. Drives compile-time exhaustiveness on
 * visitorKeys.
 */
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
  | 'TupleConsExpr'
  | 'ConditionalExpr'
  | 'ForExpr'
  | 'SplatExpr'
  | 'IndexExpr'
  | 'RelativeTraversalExpr'
  | 'ParenthesesExpr'
  | 'BinaryOpExpr'
  | 'UnaryOpExpr'
  | 'UnknownExpr'
  | 'TraverseRoot'
  | 'TraverseAttr'
  | 'TraverseIndex';
