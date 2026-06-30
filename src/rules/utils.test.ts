import { beforeAll, describe, expect, it } from 'vitest';
import { initialize, parse } from '../parser/index.js';
import type { Expression } from '../parser/types.js';
import { collectTraversals, traversalText } from './utils.js';

beforeAll(async () => {
  await initialize();
});

async function exprOf(code: string): Promise<Expression> {
  const result = await parse(`locals { x = ${code} }`);
  const expr = result.ast.blocks[0]?.body.attributes[0]?.expression;
  if (!expr) throw new Error('no expression parsed');
  return expr;
}

function names(expr: Expression): string[] {
  return collectTraversals(expr).map(traversalText);
}

describe('collectTraversals', () => {
  it('skips bareword object keys but collects value references', async () => {
    expect(names(await exprOf('{ FOO = var.x }'))).toEqual(['var.x']);
  });

  it('descends into function call arguments', async () => {
    expect(names(await exprOf('format("%s", var.path)'))).toEqual(['var.path']);
  });

  it('descends into template interpolations', async () => {
    expect(names(await exprOf('"${var.a}"'))).toEqual(['var.a']);
  });

  it('collects the collection of a for-expression', async () => {
    expect(names(await exprOf('[for v in var.xs : v]'))).toEqual(['var.xs']);
  });

  it('does not treat a for-expression loop var as a reference', async () => {
    expect(names(await exprOf('[for v in var.xs : v.id]'))).toEqual(['var.xs']);
  });

  it('does not treat object-form key/value loop vars as references', async () => {
    expect(names(await exprOf('{for k, v in var.m : k => v.id}'))).toEqual([
      'var.m',
    ]);
  });

  it('collects references in a for-expression body that are not loop vars', async () => {
    expect(
      names(await exprOf('[for v in var.xs : "${v}${local.suffix}"]')),
    ).toEqual(['var.xs', 'local.suffix']);
  });

  it('keeps outer loop vars bound inside a nested for-expression', async () => {
    expect(
      names(await exprOf('[for o in var.outer : [for i in o.items : i.id]]')),
    ).toEqual(['var.outer']);
  });

  it('collects the source of a splat expression', async () => {
    expect(names(await exprOf('aws_instance.x[*].id'))).toEqual([
      'aws_instance.x',
    ]);
  });

  it('collects both positions of a non-constant index expression', async () => {
    expect(names(await exprOf('local.map[var.lookup_key]'))).toEqual([
      'local.map',
      'var.lookup_key',
    ]);
  });

  it('renders a folded constant index as part of the traversal text', async () => {
    expect(names(await exprOf('var.commands[0]'))).toEqual(['var.commands[0]']);
  });
});
