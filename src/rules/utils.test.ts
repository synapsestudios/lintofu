import { beforeAll, describe, expect, it } from 'vitest';
import { initialize, parse } from '../parser/index.js';
import type { Expression } from '../parser/types.js';
import { collectTraversals } from './utils.js';

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
  return collectTraversals(expr).map((t) =>
    t.traversal.map((s) => s.name).join('.'),
  );
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
});
