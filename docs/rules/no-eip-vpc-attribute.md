# no-eip-vpc-attribute

Flag the `vpc` argument on a `resource "aws_eip"` block. The AWS provider removed `vpc` in v6.0.0, so it now fails `tofu validate` and `tofu plan` on every 6.x provider. Use `domain = "vpc"` instead, or omit `domain` and let it default.

## Why

The `vpc` argument on `aws_eip` was deprecated ([terraform-provider-aws #26714](https://github.com/hashicorp/terraform-provider-aws/pull/26714)) in favor of `domain`, then removed from the schema in v6.0.0 ([#26715](https://github.com/hashicorp/terraform-provider-aws/pull/26715)). Any config that still sets `vpc` errors out on validate and plan once the provider is on 6.x. See the [AWS provider v6 upgrade guide](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-6-upgrade) and the [`aws_eip` resource docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip).

`vpc = true` selected the VPC domain, which is `domain = "vpc"`. `vpc = false` selected the EC2-Classic `standard` domain. EC2-Classic is retired, so deleting `vpc = false` lets `domain` default to the computed `"vpc"`. That is an intended semantic change: there is no non-VPC domain to fall back to anymore.

## What it flags

A `vpc` argument inside a `resource "aws_eip"` block:

```hcl
resource "aws_eip" "nat" {
  vpc = true                 # removed in provider v6, flagged
}
```

## What it does not flag

- `data "aws_eip"` blocks. Only the `resource` form is checked.
- `aws_eip` blocks that already use `domain`:

```hcl
resource "aws_eip" "nat" {
  domain = "vpc"
}
```

## Autofix

Partially fixable.

- `vpc = true` becomes `domain = "vpc"`.
- `vpc = false` removes the attribute, letting `domain` default to `"vpc"`.

The following are reported without a fix:

- A non-literal value such as `vpc = var.in_vpc` or `vpc = local.enabled ? true : false`, whose boolean value cannot be proven at lint time.
- A block that already declares `domain`, where renaming `vpc = true` would emit a duplicate `domain` argument (invalid HCL).
- A `vpc` argument that shares its line with a trailing comment, to avoid consuming or de-indenting the comment.

## Options

None.
