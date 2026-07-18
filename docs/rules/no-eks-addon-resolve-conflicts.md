# no-eks-addon-resolve-conflicts

Flag the `resolve_conflicts` argument on a `resource "aws_eks_addon"` block. The AWS provider deprecated `resolve_conflicts` in v5 and removed it in v6.0.0, so it now fails `tofu validate` and `tofu plan` on every 6.x provider. Replace it with `resolve_conflicts_on_create` and `resolve_conflicts_on_update`.

## Why

`resolve_conflicts` existed on `aws_eks_addon` in provider v3 through v5, where it was later deprecated in favor of two separate arguments. Provider v6.0.0 removed it from the schema, so any config that still sets it errors out as an unsupported argument. See the [AWS provider v6 upgrade guide](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-6-upgrade) and the [`aws_eks_addon` resource docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_addon).

The single argument was split into two:

- `resolve_conflicts_on_create` accepts `NONE` or `OVERWRITE`.
- `resolve_conflicts_on_update` accepts `NONE`, `OVERWRITE`, or `PRESERVE`.

`PRESERVE` applies only on update, so the old `resolve_conflicts = "PRESERVE"` value maps to the update argument alone. Choose the create and update values that match your intent when you migrate.

## What it flags

A `resolve_conflicts` argument inside a `resource "aws_eks_addon"` block:

```hcl
resource "aws_eks_addon" "vpc_cni" {
  resolve_conflicts = "OVERWRITE"   # removed in provider v6, flagged
}
```

## What it does not flag

- A block that already uses `resolve_conflicts_on_create` and `resolve_conflicts_on_update`:

```hcl
resource "aws_eks_addon" "vpc_cni" {
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"
}
```

- `data "aws_eks_addon"` blocks. Only the `resource` form is checked.
- `resolve_conflicts` on any other resource type.

## Autofix

None. The removed value splits across two arguments, and `PRESERVE` is valid only on the update side, so there is no safe mechanical rewrite. Migrate by hand: pick a `resolve_conflicts_on_create` value (`NONE` or `OVERWRITE`) and a `resolve_conflicts_on_update` value (`NONE`, `OVERWRITE`, or `PRESERVE`) that match your intent.

## Options

None.
