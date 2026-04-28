import type { File } from '@eslint/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { OpenTofuLanguage } from './language.js';
import { initialize } from './parser/index.js';

beforeAll(async () => {
  await initialize();
});

function file(body: string, path = 'test.tf'): File {
  return { body, path, physicalPath: path, bom: false };
}

describe('OpenTofuLanguage', () => {
  it('declares the ESLint Language contract shape', () => {
    const lang = new OpenTofuLanguage();
    expect(lang.fileType).toBe('text');
    expect(lang.lineStart).toBe(1);
    expect(lang.columnStart).toBe(1);
    expect(lang.nodeTypeKey).toBe('type');
  });

  it('parse returns ok:true with the AST for valid input', () => {
    const lang = new OpenTofuLanguage();
    const result = lang.parse(file('variable "x" {}'), {
      languageOptions: {},
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ast = result.ast as {
        type: string;
        blocks: { kind: string }[];
      };
      expect(ast.type).toBe('Body');
      expect(ast.blocks[0]?.kind).toBe('variable');
    }
  });

  it('parse returns ok:false with errors on syntax errors', () => {
    const lang = new OpenTofuLanguage();
    const result = lang.parse(file('variable "x" {', 'bad.tf'), {
      languageOptions: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
      const err = result.errors[0];
      expect(err).toBeDefined();
      if (err) {
        expect(err.message.length).toBeGreaterThan(0);
        expect(err.line).toBeGreaterThanOrEqual(1);
        expect(err.column).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('createSourceCode returns a SourceCode carrying text and ast', () => {
    const lang = new OpenTofuLanguage();
    const src = 'variable "x" {}';
    const f = file(src);
    const parsed = lang.parse(f, { languageOptions: {} });
    if (!parsed.ok) throw new Error('expected parse to succeed');
    const sc = lang.createSourceCode(f, parsed, { languageOptions: {} });
    expect(sc.text).toBe(src);
    expect(sc.ast.type).toBe('Body');
    expect(sc.ast.blocks[0]?.kind).toBe('variable');
  });

  it('getLoc returns an ESTree SourceLocation (no offset field)', () => {
    const lang = new OpenTofuLanguage();
    const src = 'variable "region" {}';
    const f = file(src);
    const parsed = lang.parse(f, { languageOptions: {} });
    if (!parsed.ok) throw new Error('expected parse to succeed');
    const sc = lang.createSourceCode(f, parsed, { languageOptions: {} });
    const block = sc.ast.blocks[0];
    if (!block) throw new Error('expected one block');
    const loc = sc.getLoc(block);
    expect(loc.start.line).toBe(1);
    expect(loc.start.column).toBe(1);
    expect(loc.end.line).toBe(1);
    expect(loc.end.column).toBe(src.length + 1);
    expect('offset' in loc.start).toBe(false);
    expect('offset' in loc.end).toBe(false);
  });

  it('getRange returns a [startOffset, endOffset] tuple', () => {
    const lang = new OpenTofuLanguage();
    const src = 'variable "region" {}';
    const f = file(src);
    const parsed = lang.parse(f, { languageOptions: {} });
    if (!parsed.ok) throw new Error('expected parse to succeed');
    const sc = lang.createSourceCode(f, parsed, { languageOptions: {} });
    const block = sc.ast.blocks[0];
    if (!block) throw new Error('expected one block');
    const range = sc.getRange(block);
    expect(Array.isArray(range)).toBe(true);
    expect(range).toEqual([0, src.length]);
  });

  it('traverse yields paired enter/exit steps for every node, in pre-order', () => {
    const lang = new OpenTofuLanguage();
    const src = 'variable "x" { description = "hello" }';
    const f = file(src);
    const parsed = lang.parse(f, { languageOptions: {} });
    if (!parsed.ok) throw new Error('expected parse to succeed');
    const sc = lang.createSourceCode(f, parsed, { languageOptions: {} });

    const steps = [...sc.traverse()];

    expect(steps.length % 2).toBe(0);
    for (const step of steps) {
      expect(step.kind).toBe(1);
    }

    const first = steps[0];
    const last = steps[steps.length - 1];
    if (first?.kind !== 1 || last?.kind !== 1) {
      throw new Error('expected first/last steps to be VisitNodeStep');
    }
    expect(first.phase).toBe(1);
    expect((first.target as { type: string }).type).toBe('Body');
    expect(last.phase).toBe(2);
    expect((last.target as { type: string }).type).toBe('Body');

    // Body → Block → (Block.body) Body → Attribute → TemplateExpr →
    // LiteralValueExpr = 6 nodes × 2 = 12 steps.
    expect(steps).toHaveLength(12);

    const enterStack: unknown[] = [];
    for (const step of steps) {
      if (step.kind !== 1) continue;
      if (step.phase === 1) enterStack.push(step.target);
      else {
        const popped = enterStack.pop();
        expect(popped).toBe(step.target);
      }
    }
    expect(enterStack).toEqual([]);
  });
});
