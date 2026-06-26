import { beforeAll, describe, expect, it } from 'vitest';
import { initialize, parse } from './parser/index.js';
import { visitorKeys } from './visitor-keys.js';

beforeAll(async () => {
  await initialize();
});

function walkAll(node: unknown, visit: (type: string) => void): void {
  if (!node || typeof node !== 'object') return;
  const record = node as Record<string, unknown>;
  if (typeof record.type === 'string') {
    visit(record.type);
  }
  for (const value of Object.values(record)) {
    if (Array.isArray(value))
      value.forEach((v) => {
        walkAll(v, visit);
      });
    else walkAll(value, visit);
  }
}

describe('visitorKeys', () => {
  it('declares entries for every known NodeType', () => {
    const keys = Object.keys(visitorKeys).sort();
    expect(keys).toEqual(
      [
        'Attribute',
        'Block',
        'Body',
        'ConditionalExpr',
        'ForExpr',
        'FunctionCallExpr',
        'LiteralValueExpr',
        'ObjectConsExpr',
        'ObjectConsKeyExpr',
        'ScopeTraversalExpr',
        'SplatExpr',
        'TemplateExpr',
        'TemplateWrapExpr',
        'TraverseAttr',
        'TraverseRoot',
        'UnknownExpr',
      ].sort(),
    );
  });

  it('covers every node type the parser emits on a rich fixture', async () => {
    const fixture = [
      'variable "region" {',
      '  description = "hello ${var.x}"',
      '  default     = var.enabled ? var.a : var.b',
      '}',
      'terraform {',
      '  required_providers = {',
      '    aws = { version = "~> 5.0" }',
      '  }',
      '}',
    ].join('\n');
    const { ast, diagnostics } = await parse(fixture, { filename: 'f.tf' });
    expect(diagnostics).toEqual([]);

    const encountered = new Set<string>();
    walkAll(ast, (type) => encountered.add(type));

    expect(encountered).toContain('Body');
    expect(encountered).toContain('Block');
    expect(encountered).toContain('Attribute');
    expect(encountered).toContain('TemplateExpr');
    expect(encountered).toContain('LiteralValueExpr');
    expect(encountered).toContain('ScopeTraversalExpr');
    expect(encountered).toContain('ObjectConsExpr');

    const missing = [...encountered].filter((t) => !(t in visitorKeys));
    expect(missing, `missing visitorKeys for: ${missing.join(', ')}`).toEqual(
      [],
    );
  });
});
