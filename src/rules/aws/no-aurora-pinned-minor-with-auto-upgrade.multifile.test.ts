import type { Plugin } from '@eslint/core';
import { Linter } from 'eslint';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';

beforeAll(async () => {
  await initialize();
});

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'lintofu-multifile-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function verify(targetFile: string, moduleDir: string) {
  const linter = new Linter({ cwd: moduleDir });
  const code = readFileSync(targetFile, 'utf8');
  return linter.verify(
    code,
    [
      {
        files: ['**/*.tf', '**/*.tofu'],
        plugins: { lintofu: plugin as unknown as Plugin },
        language: 'lintofu/opentofu' as never,
        rules: {
          'lintofu/no-aurora-pinned-minor-with-auto-upgrade': 'warn',
        },
      } as never,
    ],
    { filename: targetFile },
  );
}

describe('no-aurora-pinned-minor-with-auto-upgrade (multi-file)', () => {
  it('warns when the instance in a sibling file has auto upgrade on', () => {
    const clusterPath = join(dir, 'cluster.tf');
    writeFileSync(
      clusterPath,
      `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "15.4"
}`,
    );
    writeFileSync(
      join(dir, 'instance.tf'),
      `resource "aws_rds_cluster_instance" "ci" {
  cluster_identifier = aws_rds_cluster.c.id
}`,
    );

    const messages = verify(clusterPath, dir);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.messageId).toBe('pinnedMinorWithAutoUpgrade');
    expect(messages[0]?.severity).toBe(1);
  });

  it('stays silent when a sibling instance opts out of auto upgrade', () => {
    const clusterPath = join(dir, 'cluster.tf');
    writeFileSync(
      clusterPath,
      `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "15.4"
}`,
    );
    writeFileSync(
      join(dir, 'instance.tf'),
      `resource "aws_rds_cluster_instance" "ci" {
  cluster_identifier         = aws_rds_cluster.c.id
  auto_minor_version_upgrade = false
}`,
    );

    expect(verify(clusterPath, dir)).toHaveLength(0);
  });
});
