import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-pinned-minor-with-auto-upgrade.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-pinned-minor-with-auto-upgrade', rule, {
  valid: [
    {
      code: `resource "aws_db_instance" "db" {
  engine                     = "postgres"
  engine_version             = "15"
  auto_minor_version_upgrade = true
}`,
    },
    {
      code: `resource "aws_db_instance" "db" {
  engine                     = "postgres"
  engine_version             = "15.5"
  auto_minor_version_upgrade = false
}`,
    },
    {
      code: `resource "aws_db_instance" "db" {
  engine         = "postgres"
  engine_version = var.pg_version
}`,
    },
    {
      code: `resource "aws_db_instance" "db" {
  engine                     = "postgres"
  engine_version             = "15.5"
  auto_minor_version_upgrade = var.flag
}`,
    },
    {
      code: `resource "aws_rds_cluster_instance" "ci" {
  engine         = "aurora-mysql"
  engine_version = "8.0.mysql_aurora.3.04.0"
}`,
    },
    {
      code: `resource "aws_elasticache_cluster" "c" {
  engine         = "redis"
  engine_version = "5.0.6"
}`,
    },
    {
      code: `resource "aws_elasticache_cluster" "c" {
  engine         = "memcached"
  engine_version = "1.6.17"
}`,
    },
  ],
  invalid: [
    {
      code: `resource "aws_db_instance" "db" {
  engine                     = "postgres"
  engine_version             = "15.5"
  auto_minor_version_upgrade = true
}`,
      errors: [{ messageId: 'pinnedMinorWithAutoUpgrade' }],
    },
    {
      code: `resource "aws_db_instance" "db" {
  engine         = "postgres"
  engine_version = "15.5"
}`,
      errors: [{ messageId: 'pinnedMinorWithAutoUpgrade' }],
    },
    {
      code: `resource "aws_rds_cluster_instance" "ci" {
  engine         = "aurora-postgresql"
  engine_version = "15.4"
}`,
      errors: [{ messageId: 'pinnedMinorWithAutoUpgrade' }],
    },
    {
      code: `resource "aws_memorydb_cluster" "m" {
  engine_version = "7.1"
}`,
      errors: [{ messageId: 'pinnedMinorWithAutoUpgrade' }],
    },
    {
      code: `resource "aws_mq_broker" "b" {
  engine_type    = "ActiveMQ"
  engine_version = "5.17.6"
}`,
      errors: [{ messageId: 'pinnedMinorWithAutoUpgrade' }],
    },
    {
      code: `resource "aws_elasticache_cluster" "c" {
  engine         = "redis"
  engine_version = "6.2"
}`,
      errors: [{ messageId: 'pinnedMinorWithAutoUpgrade' }],
    },
    {
      code: `resource "aws_elasticache_replication_group" "rg" {
  replication_group_id = "rg"
  engine_version       = "7.0"
}`,
      errors: [{ messageId: 'pinnedMinorWithAutoUpgrade' }],
    },
    {
      code: `resource "aws_elasticache_replication_group" "rg" {
  replication_group_id = "rg"
  engine               = "valkey"
  engine_version       = "7.2"
}`,
      errors: [{ messageId: 'pinnedMinorWithAutoUpgrade' }],
    },
  ],
});
