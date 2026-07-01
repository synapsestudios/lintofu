import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-aurora-pinned-minor-with-auto-upgrade.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-aurora-pinned-minor-with-auto-upgrade', rule, {
  valid: [
    {
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "15.4"
}
resource "aws_rds_cluster_instance" "ci" {
  cluster_identifier         = aws_rds_cluster.c.id
  auto_minor_version_upgrade = false
}`,
    },
    {
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "15.4"
}
resource "aws_rds_cluster_instance" "a" {
  cluster_identifier = aws_rds_cluster.c.id
}
resource "aws_rds_cluster_instance" "b" {
  cluster_identifier         = aws_rds_cluster.c.id
  auto_minor_version_upgrade = false
}`,
    },
    {
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "15"
}
resource "aws_rds_cluster_instance" "ci" {
  cluster_identifier = aws_rds_cluster.c.id
}`,
    },
    {
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "15.4"
}`,
    },
    {
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "15.4"
}
resource "aws_rds_cluster_instance" "ci" {
  cluster_identifier = aws_rds_cluster.other.id
}`,
    },
    {
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-mysql"
  engine_version = "8.0.mysql_aurora.3.04.0"
}
resource "aws_rds_cluster_instance" "ci" {
  cluster_identifier = aws_rds_cluster.c.id
}`,
    },
    {
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = var.pg_version
}
resource "aws_rds_cluster_instance" "ci" {
  cluster_identifier = aws_rds_cluster.c.id
}`,
    },
    {
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "15.4"
}
resource "aws_rds_cluster_instance" "ci" {
  cluster_identifier = "my-cluster"
}`,
    },
  ],
  invalid: [
    {
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "15.4"
}
resource "aws_rds_cluster_instance" "ci" {
  cluster_identifier         = aws_rds_cluster.c.id
  auto_minor_version_upgrade = true
}`,
      errors: [
        { messageId: 'pinnedMinorWithAutoUpgrade', data: { safeForm: '15' } },
      ],
    },
    {
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "15.4"
}
resource "aws_rds_cluster_instance" "ci" {
  cluster_identifier = aws_rds_cluster.c.id
}`,
      errors: [
        { messageId: 'pinnedMinorWithAutoUpgrade', data: { safeForm: '15' } },
      ],
    },
    {
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "16.2"
}
resource "aws_rds_cluster_instance" "a" {
  cluster_identifier = aws_rds_cluster.c.id
}
resource "aws_rds_cluster_instance" "b" {
  cluster_identifier         = aws_rds_cluster.c.id
  auto_minor_version_upgrade = true
}`,
      errors: [
        { messageId: 'pinnedMinorWithAutoUpgrade', data: { safeForm: '16' } },
      ],
    },
  ],
});
