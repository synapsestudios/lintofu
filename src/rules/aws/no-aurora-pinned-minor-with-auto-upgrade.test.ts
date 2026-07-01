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
      // An instance opts out, so auto upgrade won't fire cluster-wide.
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
      // Cluster-wide upgrade needs every instance on; one off is enough.
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
      // Already a bare major, nothing to trim.
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "15"
}
resource "aws_rds_cluster_instance" "ci" {
  cluster_identifier = aws_rds_cluster.c.id
}`,
    },
    {
      // No instance references the cluster; can't establish auto upgrade.
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "15.4"
}`,
    },
    {
      // Instance references a different cluster.
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "15.4"
}
resource "aws_rds_cluster_instance" "ci" {
  cluster_identifier = aws_rds_cluster.other.id
}`,
    },
    {
      // aurora-mysql versions have no clean numeric prefix; out of scope.
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-mysql"
  engine_version = "8.0.mysql_aurora.3.04.0"
}
resource "aws_rds_cluster_instance" "ci" {
  cluster_identifier = aws_rds_cluster.c.id
}`,
    },
    {
      // Dynamic engine_version can't be judged.
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = var.pg_version
}
resource "aws_rds_cluster_instance" "ci" {
  cluster_identifier = aws_rds_cluster.c.id
}`,
    },
    {
      // Literal string cluster_identifier is not a traversal; skipped.
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
      // Absent auto_minor_version_upgrade defaults to true.
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
      // Every instance on; still drifts.
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
