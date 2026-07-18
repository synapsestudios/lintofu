# no-db-instance-name-attribute

Flag a top-level `name` argument on a `resource "aws_db_instance"` block. The AWS provider deprecated `name` in favor of `db_name` in v4 and removed it in v5, where it is an unsupported argument. Use `db_name`, which carries the same meaning.

## Why

The top-level `name` argument on `aws_db_instance` set the name of the database to create when the instance is provisioned. The AWS provider renamed it to `db_name` in v4 to avoid confusion with resource identifiers, then removed `name` from the schema in v5. Any config that still sets `name` fails with an unsupported argument error once the provider is on 5.x. `db_name` takes the same value. See the [AWS provider v5 upgrade guide](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-5-upgrade) and the [`aws_db_instance` resource docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance).

## What it flags

A `name` argument inside a `resource "aws_db_instance"` block:

```hcl
resource "aws_db_instance" "app" {
  name = "app"                 # removed in provider v5, flagged
}
```

## What it does not flag

- `data "aws_db_instance"` blocks. The data source never had a settable `name`, so only the `resource` form is checked.
- Other resources that accept a `name` argument.
- `aws_db_instance` blocks that already use `db_name`:

```hcl
resource "aws_db_instance" "app" {
  db_name = "app"
}
```

## Autofix

Fixable. The `name` key is renamed to `db_name` and the value expression is preserved unchanged, so `name = "app"` becomes `db_name = "app"` and `name = var.db` becomes `db_name = var.db`. The rename is safe for any value type, including variable references.

The following is reported without a fix:

- A block that already declares `db_name`, where renaming `name` would emit a duplicate `db_name` argument (invalid HCL).

## Options

None.
