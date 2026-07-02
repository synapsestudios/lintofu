# provider-source-required

Every provider in `terraform.required_providers` must declare an explicit `source` using the object form `{ source = "namespace/name" }`.

## Why

Since Terraform 0.13 a provider requirement must name its source address explicitly. The legacy string form (`azurerm = "~> 2.0"`) sets only a version and leaves the source implicit, and an object requirement without a `source` has the same gap. Both fail on current Terraform and OpenTofu. Declaring `source = "namespace/name"` resolves the provider from the intended registry namespace.

Reference: [Terraform 0.13 upgrade guide](https://developer.hashicorp.com/terraform/language/v1.1.x/upgrade-guides/0-13).

## What it flags

```hcl
terraform {
  required_providers {
    azurerm = "~> 2.0"          # ❌ legacy version-string form, no source

    aws = {
      version = "~> 5.0"        # ❌ object form missing source
    }
  }
}
```

Accepted:

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"   # ✅
      version = "~> 2.0"
    }

    aws = {
      source  = "hashicorp/aws"       # ✅
      version = "~> 5.0"
    }
  }
}
```

Both the block form (`required_providers { ... }`) and the attribute form (`required_providers = { ... }`) are inspected.

## Autofix

None. The `source` address cannot be derived from the provider's local name. `azurerm` maps to `hashicorp/azurerm` for official providers, while community or in-house providers use a different namespace, so the rewrite requires author input.

## Limitations

- Providers declared with a dynamic value or a dynamic object key are skipped, since there is no static name or shape to evaluate.

## Options

None.
