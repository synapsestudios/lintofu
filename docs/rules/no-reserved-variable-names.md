# no-reserved-variable-names

A `variable` block must not be named after an OpenTofu reserved meta-argument.

## Why

OpenTofu reserves a set of names that collide with the meta-arguments a `module` block uses to call a module (`source`, `version`, `providers`, `count`, `for_each`, `lifecycle`, `depends_on`) plus `locals`. A variable declared with one of these names is rejected by OpenTofu, so catching it in the editor is faster than waiting for `tofu validate`.

The reserved set tracks current OpenTofu, which is a superset of the six names in the [Terraform 0.12 upgrade guide](https://developer.hashicorp.com/terraform/language/v1.1.x/upgrade-guides/0-12): `version` and `locals` were reserved after 0.12. See the [OpenTofu input variables docs](https://opentofu.org/docs/language/values/variables/).

## What it flags

Any of the eight reserved names used as a variable name:

```hcl
variable "count" {}       # ❌ reserved
variable "source" {}      # ❌ reserved
variable "for_each" {}    # ❌ reserved
```

Full reserved set: `source`, `version`, `providers`, `count`, `for_each`, `lifecycle`, `depends_on`, `locals`.

Accepted:

```hcl
variable "region" {}      # ✅ not reserved
variable "sources" {}     # ✅ not an exact match
variable "Count" {}       # ✅ matching is case-sensitive

output "count" { value = 1 }          # ✅ reserved only for variable blocks
resource "aws_instance" "count" {}    # ✅ reserved only for variable blocks
```

## Options

None.
