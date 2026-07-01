# no-pinned-minor-with-auto-upgrade

Warn when an AWS engine resource pins a minor `engine_version` (for example `"15.5"`) while `auto_minor_version_upgrade` is enabled.

## Why

`auto_minor_version_upgrade` lets AWS bump the engine to a newer minor version during the maintenance window, and it defaults to `true`. Once that happens, the pinned minor in your config no longer matches the live version, so every subsequent plan wants to revert the minor bump. The config and reality fight on every apply.

Two fixes resolve the contradiction:

- Set `engine_version` to a major-only constraint (`"15"`) so it tracks the latest minor, or
- Set `auto_minor_version_upgrade = false` and own the upgrades yourself.

## What it flags

```hcl
resource "aws_db_instance" "db" {
  engine                     = "postgres"
  engine_version             = "15.5"  # pinned minor
  auto_minor_version_upgrade = true    # or omitted, which defaults to true
}
```

The warning is emitted on the `engine_version` attribute.

## Version matching

The rule reports only when `engine_version` is a clean numeric version: every dot-separated segment is an integer, and there are two or more segments. `"15"` is a major-only constraint and passes. `"15.5"` and `"8.0.34"` pin a minor and are flagged.

A segment that is not purely numeric makes the version unparseable, and the rule skips it. Aurora MySQL uses a version string of the form `"8.0.mysql_aurora.3.04.0"`, which carries the non-numeric segment `mysql_aurora`. The rule cannot tell which part is the minor, so it leaves Aurora MySQL versions alone. Aurora PostgreSQL uses plain numeric versions such as `"15.4"` and is flagged normally.

Interpolated or referenced values (`engine_version = var.pg_version`) are skipped, as is a non-literal `auto_minor_version_upgrade` such as a variable or expression.

## Scope

Flagged resources, each of which has both `auto_minor_version_upgrade` and a settable `engine_version`:

- `aws_db_instance`
- `aws_rds_cluster_instance` (Aurora)
- `aws_memorydb_cluster`
- `aws_mq_broker`
- `aws_elasticache_cluster`
- `aws_elasticache_replication_group`

For ElastiCache, auto minor upgrade takes effect only on the `redis` and `valkey` engines at major version 6 or above. Memcached, and redis or valkey below major 6, are skipped.

### Excluded resources

`aws_rds_cluster` has no `auto_minor_version_upgrade` argument, only `allow_major_version_upgrade`. On Aurora, minor auto-upgrade is controlled on the companion `aws_rds_cluster_instance`, which this rule covers.

`aws_neptune_cluster_instance` is skipped because the provider states that configuring `engine_version` has no effect.

`aws_docdb_cluster_instance` is skipped because `auto_minor_version_upgrade` does not apply to Amazon DocumentDB, and `engine_version` is read-only there.
