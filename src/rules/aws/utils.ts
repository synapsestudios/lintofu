import type { Block } from '../../parser/types.js';
import { findAttribute, literalStringValue } from '../core/utils.js';

export function engineName(block: Block): string | undefined {
  const attr = findAttribute(block.body.attributes, 'engine');
  if (!attr) return undefined;
  return literalStringValue(attr.expression);
}

export function autoMinorUpgradeEnabled(block: Block): boolean {
  const attr = findAttribute(
    block.body.attributes,
    'auto_minor_version_upgrade',
  );
  if (!attr) return true;
  const expr = attr.expression;
  if (expr.type !== 'LiteralValueExpr') return false;
  return expr.value !== false;
}
