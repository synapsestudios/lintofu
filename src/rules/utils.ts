import type {
  Attribute,
  Block,
  Expression,
  ObjectConsItem,
} from '../parser/types.js';

// Returns the concatenated string only when expr is a TemplateExpr made
// entirely of literal string parts. Returns undefined for interpolated or
// otherwise dynamic values so rules can opt out of judging them.
export function literalStringValue(expr: Expression): string | undefined {
  if (expr.type !== 'TemplateExpr') return undefined;
  let out = '';
  for (const part of expr.parts) {
    if (part.type !== 'LiteralValueExpr') return undefined;
    if (typeof part.value !== 'string') return undefined;
    out += part.value;
  }
  return out;
}

export function findAttribute(
  attrs: readonly Attribute[],
  name: string,
): Attribute | undefined {
  return attrs.find((a) => a.name === name);
}

export function blockLabel(block: Block): string {
  return block.labels[0] ?? '<unnamed>';
}

export type DescriptionCheck =
  | { status: 'missing' }
  | { status: 'empty'; attr: Attribute }
  | { status: 'ok' }
  | { status: 'dynamic' };

export function checkDescription(block: Block): DescriptionCheck {
  const attr = findAttribute(block.body.attributes, 'description');
  if (!attr) return { status: 'missing' };
  const value = literalStringValue(attr.expression);
  if (value === undefined) return { status: 'dynamic' };
  if (value.trim() === '') return { status: 'empty', attr };
  return { status: 'ok' };
}

// Bare-identifier keys (`version = "x"`) come through as ObjectConsKeyExpr
// wrapping a single-step ScopeTraversalExpr. Quoted keys (`"version" = "x"`)
// wrap a TemplateExpr instead.
export function objectItemKeyName(item: ObjectConsItem): string | undefined {
  const inner =
    item.keyExpr.type === 'ObjectConsKeyExpr'
      ? item.keyExpr.wrapped
      : item.keyExpr;
  if (inner.type === 'ScopeTraversalExpr' && inner.traversal.length === 1) {
    const t = inner.traversal[0];
    if (t?.type === 'TraverseRoot') return t.name;
  }
  if (inner.type === 'TemplateExpr') {
    return literalStringValue(inner);
  }
  return undefined;
}
