# no-aurora-pinned-minor-with-auto-upgrade

Warn when an Aurora PostgreSQL cluster pins `engine_version` more precisely than the auto minor upgrade enabled across its instances will hold stable.

## Why

This is the cross-resource companion to [`no-pinned-minor-with-auto-upgrade`](./no-pinned-minor-with-auto-upgrade.md). Aurora splits the two operands across two blocks, so a single-block rule cannot see both halves:

- `engine_version` is a cluster-level control on `aws_rds_cluster`. It is inert on `aws_rds_cluster_instance`: per the provider docs, an engine upgrade "must be done on the `aws_rds_cluster` `engine_version`. Trying to upgrade in `aws_cluster_instance` will not update the `engine_version`".
- `auto_minor_version_upgrade` is only on `aws_rds_cluster_instance`; `aws_rds_cluster` has no such argument.

The rule pairs each `aws_rds_cluster` with the `aws_rds_cluster_instance` blocks that reference it through `cluster_identifier`, then checks the cluster's `engine_version` against auto upgrade across those instances. Instances in sibling files of the same module are included.

Auto upgrade only fires cluster-wide when every instance opts in: AWS notes that "if any DB instance in your cluster has this setting turned off, the DB cluster isn't automatically upgraded". So the rule treats auto upgrade as on only when the AND across all instances is true, where an absent `auto_minor_version_upgrade` defaults to `true`.

## What it flags

```hcl
resource "aws_rds_cluster" "c" {
  engine         = "aurora-postgresql"
  engine_version = "15.4" # pins the minor
}

resource "aws_rds_cluster_instance" "ci" {
  cluster_identifier = aws_rds_cluster.c.id
  # auto_minor_version_upgrade omitted, which defaults to true
}
```

The warning is emitted on the cluster's `engine_version` attribute and names the drift-safe form to use (`"15"` here). AWS resolves a bare major to the current default minor and floats it under auto upgrade, so `"15"` produces no plan diff against a live `15.x`.

## What it leaves alone

- A cluster where any matching instance sets `auto_minor_version_upgrade = false`: auto upgrade won't fire, so the pin is safe.
- A cluster with no matching instances: auto upgrade can't be established, so there is nothing to flag.
- `engine = "aurora-mysql"`: version strings like `"8.0.mysql_aurora.3.04.0"` have no clean numeric prefix, so no shorter form can be recommended.
- Dynamic `engine_version`, and a `cluster_identifier` written as a literal string. Only the `aws_rds_cluster.<name>` traversal form is matched.

## References

- [Provider `aws_rds_cluster_instance` (`engine_version` inert)](https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/rds_cluster_instance.html.markdown)
- [Provider `aws_rds_cluster`](https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/rds_cluster.html.markdown)
- [Aurora auto minor version upgrade (cluster-wide AND)](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_UpgradeDBInstance.Maintenance.html)
- [Aurora version policy (bare major floats under auto upgrade)](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.VersionPolicy.Versioning.html)
