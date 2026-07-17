# no-instance-cpu-count-attributes

Flag the top-level `cpu_core_count` and `cpu_threads_per_core` arguments on an `aws_instance` resource. Both were removed from the schema in AWS provider v6; move their values into a `cpu_options` block using `core_count` and `threads_per_core`.

## Why

The [AWS provider v6 upgrade guide](https://api.opentofu.org/registry/docs/providers/opentofu/aws/v6.42.0/index.md) removed the deprecated `cpu_core_count` and `cpu_threads_per_core` arguments from [`aws_instance`](https://api.opentofu.org/registry/docs/providers/opentofu/aws/v6.42.0/resources/instance.md). A plan against v6 fails with an unsupported-argument error until the values move into the nested `cpu_options` block, where they are expressed as `core_count` and `threads_per_core`.

## What it flags

```hcl
resource "aws_instance" "web" {
  instance_type        = "t3.micro"
  cpu_core_count       = 2   # removed in v6
  cpu_threads_per_core = 1   # removed in v6
}
```

Accepted:

```hcl
resource "aws_instance" "web" {
  instance_type = "t3.micro"
  cpu_options {
    core_count       = 2
    threads_per_core = 1
  }
}
```

## What it does not flag

- A `data "aws_instance"` source carrying these names: data sources are never migrated.
- Any other resource type that happens to use the same argument names.
- An `aws_instance` that already declares the values inside a `cpu_options` block.

## Autofix

When every offending value is a literal and the resource has no existing `cpu_options` block, the arguments are consolidated into a new `cpu_options` block:

```hcl
resource "aws_instance" "web" {   # before
  cpu_core_count       = 2
  cpu_threads_per_core = 1
}

resource "aws_instance" "web" {   # after
  cpu_options {
    core_count       = 2
    threads_per_core = 1
  }
}
```

The rule reports without a fix in two cases, because neither can be migrated safely by a text edit:

- An offending value is a non-literal expression, such as `cpu_core_count = var.cores`.
- The resource already has a `cpu_options` block; merging into it could clobber existing settings.

## Options

None.

## Future work

`aws_spot_instance_request` carries the same removed arguments and the same migration. It is out of scope for this rule and could become its own rule later.
