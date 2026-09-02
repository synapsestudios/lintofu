import type { SettingsConfig } from '@eslint/core';
import type {
  Attribute,
  Block,
  Expression,
  ObjectConsItem,
  ScopeTraversalExpr,
} from '../../parser/types.js';
import { visitorKeys } from '../../visitor-keys.js';

// Collects every ScopeTraversalExpr reachable from expr, descending via
// visitorKeys so new expression types are handled as soon as they have an
// entry there.
export function collectTraversals(expr: Expression): ScopeTraversalExpr[] {
  const out: ScopeTraversalExpr[] = [];
  gather(expr, out, new Set());
  return out;
}

function gather(
  expr: Expression,
  out: ScopeTraversalExpr[],
  bound: ReadonlySet<string>,
): void {
  if (expr.type === 'ScopeTraversalExpr') {
    const root = expr.traversal[0];
    if (root?.type === 'TraverseRoot' && bound.has(root.name)) return;
    out.push(expr);
    return;
  }
  // A bareword object key (`FOO = ...`) arrives as ObjectConsKeyExpr wrapping a
  // single-step ScopeTraversalExpr; that's a name, never a reference.
  if (expr.type === 'ObjectConsKeyExpr') return;
  if (expr.type === 'ObjectConsExpr') {
    for (const item of expr.items) {
      gather(item.keyExpr, out, bound);
      gather(item.valueExpr, out, bound);
    }
    return;
  }
  if (expr.type === 'ForExpr') {
    // The collection is evaluated in the outer scope; keyVar/valVar only bind
    // inside the key/value/cond exprs, so refs there rooted on them are local.
    gather(expr.collExpr, out, bound);
    const inner = new Set(bound);
    if (expr.keyVar) inner.add(expr.keyVar);
    if (expr.valVar) inner.add(expr.valVar);
    if (expr.keyExpr) gather(expr.keyExpr, out, inner);
    gather(expr.valExpr, out, inner);
    if (expr.condExpr) gather(expr.condExpr, out, inner);
    return;
  }
  const indexed = expr as unknown as Record<string, unknown>;
  for (const key of visitorKeys[expr.type]) {
    const child = indexed[key];
    if (Array.isArray(child)) {
      for (const c of child) if (isExpression(c)) gather(c, out, bound);
    } else if (isExpression(child)) {
      gather(child, out, bound);
    }
  }
}

function isExpression(value: unknown): value is Expression {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).type === 'string'
  );
}

// Renders a traversal back to source-like text: `var.commands[0]`,
// `local.map["region"]`. Index steps are bracketed; attr/root steps dotted.
export function traversalText(expr: ScopeTraversalExpr): string {
  let out = '';
  for (const step of expr.traversal) {
    if (step.type === 'TraverseIndex') {
      out += `[${typeof step.key === 'string' ? JSON.stringify(step.key) : String(step.key)}]`;
    } else {
      out += out === '' ? step.name : `.${step.name}`;
    }
  }
  return out;
}

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

export function trimNumericVersion(
  version: string,
  depth: number,
): string | undefined {
  const parts = version.split('.');
  if (!parts.every((p) => /^\d+$/.test(p))) return undefined;
  if (parts.length <= depth) return undefined;
  return parts.slice(0, depth).join('.');
}

export function traversalHead(
  expr: ScopeTraversalExpr,
): readonly [string, string] | undefined {
  const [root, name] = expr.traversal;
  if (root?.type !== 'TraverseRoot') return undefined;
  if (name?.type !== 'TraverseAttr') return undefined;
  return [root.name, name.name];
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

export interface RequiredProviderEntry {
  name: string;
  value: Expression;
}

export function requiredProviderEntries(
  terraform: Block,
): RequiredProviderEntry[] {
  const blockForm = terraform.body.blocks.find(
    (b) => b.kind === 'required_providers',
  );
  if (blockForm) {
    return blockForm.body.attributes.map((attr) => ({
      name: attr.name,
      value: attr.expression,
    }));
  }
  const attrForm = findAttribute(
    terraform.body.attributes,
    'required_providers',
  );
  if (attrForm?.expression.type !== 'ObjectConsExpr') return [];
  const out: RequiredProviderEntry[] = [];
  for (const item of attrForm.expression.items) {
    const name = objectItemKeyName(item);
    if (name === undefined) continue;
    out.push({ name, value: item.valueExpr });
  }
  return out;
}

export function objectSetting(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

export function lintofuSettings(
  settings: SettingsConfig,
): Record<string, unknown> {
  return objectSetting(settings.lintofu);
}
