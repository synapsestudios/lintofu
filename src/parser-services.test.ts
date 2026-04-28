import type { File } from '@eslint/core';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OpenTofuLanguage } from './language.js';
import { initialize } from './parser/index.js';

beforeAll(async () => {
  await initialize();
});

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'lintofu-services-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function file(path: string, body: string): File {
  return { body, path, physicalPath: path, bom: false };
}

describe('sourceCode.parserServices.projectIndex', () => {
  it('resolves a resource defined in a sibling file', () => {
    const sgPath = join(dir, 'sg.tf');
    const rulePath = join(dir, 'rule.tf');
    writeFileSync(sgPath, `resource "aws_security_group" "foo" {}`);
    writeFileSync(
      rulePath,
      `resource "aws_vpc_security_group_ingress_rule" "r" {
  security_group_id = aws_security_group.foo.id
}`,
    );

    const lang = new OpenTofuLanguage();
    const f = file(
      rulePath,
      `resource "aws_vpc_security_group_ingress_rule" "r" {
  security_group_id = aws_security_group.foo.id
}`,
    );
    const parsed = lang.parse(f, { languageOptions: {} });
    if (!parsed.ok) throw new Error('expected parse to succeed');
    const sc = lang.createSourceCode(f, parsed, { languageOptions: {} });

    const block = sc.parserServices.projectIndex.findResource({
      kind: 'resource',
      labels: ['aws_security_group', 'foo'],
    });
    expect(block?.labels).toEqual(['aws_security_group', 'foo']);
  });
});
