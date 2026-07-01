# no-pinned-minor-with-auto-upgrade

Warn when an AWS engine resource pins `engine_version` more precisely than an enabled `auto_minor_version_upgrade` will hold stable.

## Why

`auto_minor_version_upgrade` lets AWS move the engine to a newer minor version during the maintenance window, and it defaults to `true`. If `engine_version` pins the exact segment that AWS moves, the config no longer matches the live version after an upgrade, and every subsequent plan wants to revert the bump.

The provider suppresses that diff when `engine_version` is a prefix of the running version and records the resolved value in `engine_version_actual`. The fix is to pin only up to the drift-safe boundary for the engine, or to set `auto_minor_version_upgrade = false`.

## What it flags

```hcl
resource "aws_db_instance" "db" {
  engine                     = "postgres"
  engine_version             = "15.4"  # pins the minor
  auto_minor_version_upgrade = true    # or omitted, which defaults to true
}
```

The warning is emitted on the `engine_version` attribute and names the drift-safe form to use (`"15"` here).

## Engine awareness

The drift-safe boundary is engine-specific, because the segment AWS auto-moves differs by engine. The rule reads the `engine` attribute and only flags a version pinned deeper than that engine's boundary. Values it cannot parse as a clean numeric version, interpolated values, and a non-literal `auto_minor_version_upgrade` are all skipped.

| Resource / engine | Drift-safe form | Flagged example | Source |
| --- | --- | --- | --- |
| `aws_db_instance` postgres (major ≥ 10) | `"15"` | `"15.4"` | [RDS PostgreSQL version numbering](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.PostgreSQL.VersionID.html) |
| `aws_db_instance` postgres (major < 10) | `"9.6"` | `"9.6.12"` | [RDS PostgreSQL version numbering](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.PostgreSQL.VersionID.html) |
| `aws_db_instance` mysql | `"8.0"` | `"8.0.34"` | [RDS MySQL version numbering](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.MySQL.VersionID.html) |
| `aws_db_instance` mariadb | `"10.6"` | `"10.6.14"` | [RDS MariaDB version numbering](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.MariaDB.VersionID.html) |
| `aws_db_instance` db2-ae, db2-se | `"11.5"` | `"11.5.9.0"` | [RDS Db2 version management](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Db2.Concepts.VersionMgmt.html) |
| `aws_elasticache_cluster`, `aws_elasticache_replication_group` redis/valkey major 6 | `"6.x"` | `"6.2"` | [Provider elasticache_replication_group docs](https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/elasticache_replication_group.html.markdown) |

## Exemptions

These are recognized and intentionally left alone. Each has a documented reason.

`aws_db_instance` **oracle-\*** and **sqlserver-\***: the docs define no drift-safe numeric prefix. Oracle's minor version is a Release Update or Supplemental Patch Bundle suffix (`19.0.0.0.ru-2025-10...`), and SQL Server's resolvable versions carry a full build and `.vN` suffix (`16.00.4250.1.v1`). There is no shorter form to recommend.

`aws_elasticache_*` **redis/valkey major 7+**, **redis 5 and below**, and **memcached**: for major 7+ the minor is mandatory (`"7.2"`), so no shorter form exists; below major 6 `auto_minor_version_upgrade` is not supported; memcached does not support it at all.

`aws_memorydb_cluster`: MemoryDB accepts only `major.minor` (`"7.1"`) and rejects a full version, so there is no over-precise form to flag.

`aws_mq_broker`: RabbitMQ is specified as `major.minor` and is already drift-safe; ActiveMQ pins a full `X.Y.Z` version with no shorter form, and current ActiveMQ versions require `auto_minor_version_upgrade` to stay enabled.

`aws_rds_cluster` and `aws_rds_cluster_instance` (Aurora): the two operands live in different blocks. `engine_version` is a cluster-level control and is inert on the instance, while `auto_minor_version_upgrade` is expressed on the instance. A single-block rule cannot evaluate the pair. A cross-resource rule is tracked separately.
