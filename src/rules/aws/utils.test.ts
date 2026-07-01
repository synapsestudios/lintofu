import { beforeAll, describe, expect, it } from 'vitest';
import { initialize, parse } from '../../parser/index.js';
import type { Block } from '../../parser/types.js';
import { autoMinorUpgradeEnabled, engineName } from './utils.js';

beforeAll(async () => {
  await initialize();
});

async function blockOf(code: string): Promise<Block> {
  const result = await parse(code);
  const block = result.ast.blocks[0];
  if (!block) throw new Error('no block parsed');
  return block;
}

describe('engineName', () => {
  it('returns the literal engine value', async () => {
    const block = await blockOf(
      `resource "aws_rds_cluster" "c" {
  engine = "aurora-postgresql"
}`,
    );
    expect(engineName(block)).toBe('aurora-postgresql');
  });

  it('returns undefined when engine is absent', async () => {
    const block = await blockOf(`resource "aws_rds_cluster" "c" {}`);
    expect(engineName(block)).toBeUndefined();
  });

  it('returns undefined when engine is dynamic', async () => {
    const block = await blockOf(
      `resource "aws_rds_cluster" "c" {
  engine = var.engine
}`,
    );
    expect(engineName(block)).toBeUndefined();
  });
});

describe('autoMinorUpgradeEnabled', () => {
  it('defaults to true when the attribute is absent', async () => {
    const block = await blockOf(`resource "aws_rds_cluster_instance" "ci" {}`);
    expect(autoMinorUpgradeEnabled(block)).toBe(true);
  });

  it('is true when set to a literal true', async () => {
    const block = await blockOf(
      `resource "aws_rds_cluster_instance" "ci" {
  auto_minor_version_upgrade = true
}`,
    );
    expect(autoMinorUpgradeEnabled(block)).toBe(true);
  });

  it('is false when set to a literal false', async () => {
    const block = await blockOf(
      `resource "aws_rds_cluster_instance" "ci" {
  auto_minor_version_upgrade = false
}`,
    );
    expect(autoMinorUpgradeEnabled(block)).toBe(false);
  });

  it('is false when the value is dynamic (cannot prove it is on)', async () => {
    const block = await blockOf(
      `resource "aws_rds_cluster_instance" "ci" {
  auto_minor_version_upgrade = var.amvu
}`,
    );
    expect(autoMinorUpgradeEnabled(block)).toBe(false);
  });
});
