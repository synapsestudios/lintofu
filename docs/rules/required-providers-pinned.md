# required-providers-pinned

Every provider declared in `terraform.required_providers` must carry a `version` constraint.

## Why

Unpinned provider versions drift between machines and CI runs. A plan produced today may not match a plan produced tomorrow when a provider ships a breaking change. Pinning protects reproducibility.

## What it flags

```hcl
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"         # ❌ no version
    }
  }
}
```

Accepted:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"               # ✅ pinned
    }
  }
}
```

## Limitations

- Only the block form of `required_providers` is inspected in v0.1. The attribute form (`required_providers = { ... }`) is silently ignored; support will land when the AST converter handles attribute-style required_providers cleanly.
- Dynamic object values are not evaluated.

## Options

None.
