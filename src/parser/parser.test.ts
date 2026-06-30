import { describe, expect, it } from 'vitest';
import { initialize, parse, parseSync } from './index.js';

describe('parse', () => {
  it('returns a Body with no blocks or attributes for empty input', async () => {
    const result = await parse('', { filename: 'empty.tf' });

    expect(result.ast.type).toBe('Body');
    expect(result.ast.blocks).toEqual([]);
    expect(result.ast.attributes).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it('handles concurrent calls with a single shared WASM instance', async () => {
    const [r1, r2, r3] = await Promise.all([
      parse('variable "region" {}'),
      parse('output "arn" {}'),
      parse('locals { a = 1 }'),
    ]);

    expect(r1.ast.blocks[0]?.kind).toBe('variable');
    expect(r1.ast.blocks[0]?.labels).toEqual(['region']);
    expect(r2.ast.blocks[0]?.kind).toBe('output');
    expect(r3.ast.blocks[0]?.kind).toBe('locals');
  });

  it('handles repeated sequential calls', async () => {
    for (let i = 0; i < 5; i++) {
      const result = await parse(`variable "v${i}" {}`);
      expect(result.ast.blocks[0]?.labels[0]).toBe(`v${i}`);
    }
  });

  it('reports syntax errors as diagnostics rather than throwing', async () => {
    const result = await parse('variable "x" {', { filename: 'bad.tf' });

    expect(result.diagnostics.length).toBeGreaterThan(0);
    const diag = result.diagnostics[0];
    if (!diag) throw new Error('expected at least one diagnostic');
    expect(diag.severity).toBe('error');
    expect(diag.summary.length).toBeGreaterThan(0);
    expect(diag.range.start.line).toBeGreaterThanOrEqual(1);
    expect(result.ast.type).toBe('Body');
  });

  it('exposes a sync parser once initialize() has run', async () => {
    await initialize();
    const result = parseSync('variable "x" {}', { filename: 'sync.tf' });
    expect(result.ast.blocks[0]?.kind).toBe('variable');
    expect(result.ast.blocks[0]?.labels[0]).toBe('x');
  });

  it('accepts a filename argument', async () => {
    const result = await parse('variable', { filename: 'named.tf' });
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it('parses a function call into a FunctionCallExpr with typed args', async () => {
    const result = await parse('locals { x = format("rm -rf %s", var.path) }');
    const expr = result.ast.blocks[0]?.body.attributes[0]?.expression;
    if (expr?.type !== 'FunctionCallExpr') {
      throw new Error(`expected FunctionCallExpr, got ${expr?.type}`);
    }
    expect(expr.name).toBe('format');
    expect(expr.args).toHaveLength(2);
    expect(expr.args[1]?.type).toBe('ScopeTraversalExpr');
    expect(expr.expandFinal).toBe(false);
  });

  it('parses a ternary into a ConditionalExpr with typed branches', async () => {
    const result = await parse('locals { x = local.cond ? var.a : "b" }');
    const expr = result.ast.blocks[0]?.body.attributes[0]?.expression;
    if (expr?.type !== 'ConditionalExpr') {
      throw new Error(`expected ConditionalExpr, got ${expr?.type}`);
    }
    expect(expr.condition.type).toBe('ScopeTraversalExpr');
    expect(expr.trueResult.type).toBe('ScopeTraversalExpr');
    expect(expr.falseResult.type).toBe('TemplateExpr');
  });

  it('parses a list comprehension into a ForExpr', async () => {
    const result = await parse('locals { x = [for v in var.xs : v.id] }');
    const expr = result.ast.blocks[0]?.body.attributes[0]?.expression;
    if (expr?.type !== 'ForExpr') {
      throw new Error(`expected ForExpr, got ${expr?.type}`);
    }
    expect(expr.valVar).toBe('v');
    expect(expr.keyVar).toBe('');
    expect(expr.keyExpr).toBeUndefined();
    expect(expr.collExpr.type).toBe('ScopeTraversalExpr');
    expect(expr.valExpr.type).toBe('ScopeTraversalExpr');
  });

  it('parses an object comprehension into a ForExpr with key and value', async () => {
    const result = await parse('locals { x = {for k, v in var.m : k => v} }');
    const expr = result.ast.blocks[0]?.body.attributes[0]?.expression;
    if (expr?.type !== 'ForExpr') {
      throw new Error(`expected ForExpr, got ${expr?.type}`);
    }
    expect(expr.keyVar).toBe('k');
    expect(expr.valVar).toBe('v');
    expect(expr.keyExpr?.type).toBe('ScopeTraversalExpr');
    expect(expr.valExpr.type).toBe('ScopeTraversalExpr');
  });

  it('parses a splat into a SplatExpr with a traversal source', async () => {
    const result = await parse('locals { x = aws_instance.x[*].id }');
    const expr = result.ast.blocks[0]?.body.attributes[0]?.expression;
    if (expr?.type !== 'SplatExpr') {
      throw new Error(`expected SplatExpr, got ${expr?.type}`);
    }
    expect(expr.source.type).toBe('ScopeTraversalExpr');
  });

  it('parses a non-constant index into an IndexExpr', async () => {
    const result = await parse('locals { x = var.commands[var.i] }');
    const expr = result.ast.blocks[0]?.body.attributes[0]?.expression;
    if (expr?.type !== 'IndexExpr') {
      throw new Error(`expected IndexExpr, got ${expr?.type}`);
    }
    expect(expr.collection.type).toBe('ScopeTraversalExpr');
    expect(expr.key.type).toBe('ScopeTraversalExpr');
  });

  it('folds a constant index into the traversal as a TraverseIndex', async () => {
    const result = await parse('locals { x = var.commands[0] }');
    const expr = result.ast.blocks[0]?.body.attributes[0]?.expression;
    if (expr?.type !== 'ScopeTraversalExpr') {
      throw new Error(`expected ScopeTraversalExpr, got ${expr?.type}`);
    }
    const last = expr.traversal[expr.traversal.length - 1];
    if (last?.type !== 'TraverseIndex') {
      throw new Error(`expected TraverseIndex, got ${last?.type}`);
    }
    expect(last.key).toBe(0);
  });
});

describe('comments', () => {
  it('collects a # line comment with its trailing newline trimmed', async () => {
    const result = await parse('# note\nvariable "v" {}', { filename: 'c.tf' });

    expect(result.comments).toHaveLength(1);
    const comment = result.comments[0];
    if (!comment) throw new Error('expected one comment');
    expect(comment.type).toBe('Comment');
    expect(comment.kind).toBe('line');
    expect(comment.value).toBe('# note');
    // The trailing newline must NOT extend the range onto line 2, or
    // same-line directive detection and the unused-directive autofix break.
    expect(comment.range.start.line).toBe(1);
    expect(comment.range.end.line).toBe(1);
  });

  it('trims the trailing newline from a // line comment too', async () => {
    const result = await parse('// note\nvariable "v" {}', {
      filename: 'c.tf',
    });

    const comment = result.comments[0];
    if (!comment) throw new Error('expected one comment');
    expect(comment.kind).toBe('line');
    expect(comment.value).toBe('// note');
    expect(comment.range.end.line).toBe(1);
  });

  it('keeps a block comment range intact (no newline to trim)', async () => {
    const result = await parse('/* note */\nvariable "v" {}', {
      filename: 'c.tf',
    });

    const comment = result.comments[0];
    if (!comment) throw new Error('expected one comment');
    expect(comment.kind).toBe('block');
    expect(comment.value).toBe('/* note */');
    expect(comment.range.start.line).toBe(1);
    expect(comment.range.end.line).toBe(1);
  });

  it('does not treat a # inside a quoted string as a comment', async () => {
    const result = await parse('variable "v" {\n  default = "a # b"\n}', {
      filename: 'c.tf',
    });

    expect(result.comments).toEqual([]);
  });
});
