# documented-variables

Every `variable` block must have a non-empty `description`.

## Why

`description` shows up in `tofu plan` output when a variable is requested interactively and is surfaced by every documentation generator in the ecosystem. Modules without descriptions are harder to consume.

## What it flags

Missing attribute entirely:

```hcl
variable "region" {}                       # ❌ missing
```

Empty or whitespace-only string literal:

```hcl
variable "region" { description = "" }     # ❌ empty
variable "region" { description = "   " }  # ❌ whitespace-only
```

Accepted:

```hcl
variable "region" { description = "AWS region to deploy to" }  # ✅
variable "region" { description = "region ${var.suffix}" }     # ✅ dynamic, unjudgeable at lint time
```

## Options

None.
