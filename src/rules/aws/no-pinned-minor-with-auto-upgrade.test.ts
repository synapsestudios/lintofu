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
  engine         = "mysql"
  engine_version = "8.0"
}`,
    },
    {
      code: `resource "aws_db_instance" "db" {
  engine         = "mariadb"
  engine_version = "10.6"
}`,
    },
    {
      code: `resource "aws_db_instance" "db" {
  engine         = "postgres"
  engine_version = "9.6"
}`,
    },
    {
      code: `resource "aws_db_instance" "db" {
  engine         = "oracle-ee"
  engine_version = "19.0.0.0.ru-2025-10.rur-2025-10.r1"
}`,
    },
    {
      code: `resource "aws_db_instance" "db" {
  engine         = "sqlserver-ee"
  engine_version = "16.00.4250.1.v1"
}`,
    },
    {
      code: `resource "aws_db_instance" "db" {
  engine                     = "postgres"
  engine_version             = "15.4"
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
  engine         = var.engine
  engine_version = "15.4"
}`,
    },
    {
      code: `resource "aws_elasticache_cluster" "c" {
  engine         = "redis"
  engine_version = "6.x"
}`,
    },
    {
      code: `resource "aws_elasticache_cluster" "c" {
  engine         = "redis"
  engine_version = "7.2"
}`,
    },
    {
      code: `resource "aws_elasticache_replication_group" "rg" {
  replication_group_id = "rg"
  engine               = "valkey"
  engine_version       = "7.2"
}`,
    },
    {
      code: `resource "aws_elasticache_cluster" "c" {
  engine         = "memcached"
  engine_version = "1.6.17"
}`,
    },
    {
      code: `resource "aws_elasticache_cluster" "c" {
  engine         = "redis"
  engine_version = "5.0.6"
}`,
    },
    {
      code: `resource "aws_rds_cluster_instance" "ci" {
  engine         = "aurora-postgresql"
  engine_version = "15.4"
}`,
    },
    {
      code: `resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "15.4"
}`,
    },
    {
      code: `resource "aws_memorydb_cluster" "m" {
  engine_version = "7.1"
}`,
    },
    {
      code: `resource "aws_mq_broker" "b" {
  engine_type    = "ActiveMQ"
  engine_version = "5.17.6"
}`,
    },
  ],
  invalid: [
    {
      code: `resource "aws_db_instance" "db" {
  engine                     = "postgres"
  engine_version             = "15.4"
  auto_minor_version_upgrade = true
}`,
      errors: [
        { messageId: 'pinnedMinorWithAutoUpgrade', data: { safeForm: '15' } },
      ],
    },
    {
      code: `resource "aws_db_instance" "db" {
  engine         = "postgres"
  engine_version = "15.4"
}`,
      errors: [
        { messageId: 'pinnedMinorWithAutoUpgrade', data: { safeForm: '15' } },
      ],
    },
    {
      code: `resource "aws_db_instance" "db" {
  engine         = "mysql"
  engine_version = "8.0.34"
}`,
      errors: [
        { messageId: 'pinnedMinorWithAutoUpgrade', data: { safeForm: '8.0' } },
      ],
    },
    {
      code: `resource "aws_db_instance" "db" {
  engine         = "mariadb"
  engine_version = "10.6.14"
}`,
      errors: [
        { messageId: 'pinnedMinorWithAutoUpgrade', data: { safeForm: '10.6' } },
      ],
    },
    {
      code: `resource "aws_db_instance" "db" {
  engine         = "db2-ae"
  engine_version = "11.5.9.0"
}`,
      errors: [
        { messageId: 'pinnedMinorWithAutoUpgrade', data: { safeForm: '11.5' } },
      ],
    },
    {
      code: `resource "aws_db_instance" "db" {
  engine         = "postgres"
  engine_version = "9.6.12"
}`,
      errors: [
        { messageId: 'pinnedMinorWithAutoUpgrade', data: { safeForm: '9.6' } },
      ],
    },
    {
      code: `resource "aws_elasticache_cluster" "c" {
  engine         = "redis"
  engine_version = "6.2"
}`,
      errors: [
        { messageId: 'pinnedMinorWithAutoUpgrade', data: { safeForm: '6.x' } },
      ],
    },
    {
      code: `resource "aws_elasticache_replication_group" "rg" {
  replication_group_id = "rg"
  engine_version       = "6.5"
}`,
      errors: [
        { messageId: 'pinnedMinorWithAutoUpgrade', data: { safeForm: '6.x' } },
      ],
    },
  ],
});
