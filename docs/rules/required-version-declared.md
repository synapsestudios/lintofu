# required-version-declared

A `terraform` block that declares `required_providers` must be accompanied by a `required_version` somewhere in the same file.

## Why

Without `required_version`, any CLI binary can apply the configuration. A newer binary can upgrade the state format on write, and once the state has been upgraded, older binaries error out with no supported downgrade path. Language behavior also drifts across teammates and CI when everyone runs whatever version they happen to have installed. Declaring `required_version` constrains the CLI to a known-good range and keeps plans reproducible.

## What it flags

A `terraform` block that declares `required_providers` while no `terraform` block in the file sets `required_version`.

Block form:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

Attribute form:

```hcl
terraform {
  required_providers = {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

Accepted when `required_version` is present anywhere in the file, including a separate `terraform` block:

```hcl
terraform {
  required_version = ">= 1.5"
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

## Limitations

The check is per-file. `terraform` blocks merge across every file in a module, so a `required_version` declared in a sibling file (commonly `terraform.tf`) satisfies a `required_providers` declared elsewhere, yet this rule cannot see it. That produces a false positive in the file that lacks `required_version`. Cross-file resolution is not available today: the project index only exposes resources, not `terraform` blocks.

## Options

None.

## References

- [HashiCorp: Terraform Settings (`required_version`)](https://developer.hashicorp.com/terraform/language/terraform#terraform-required_version)
- [HashiCorp: Terraform Style Guide](https://developer.hashicorp.com/terraform/language/style)
- [tflint: `terraform_required_version`](https://github.com/terraform-linters/tflint-ruleset-terraform/blob/main/docs/rules/terraform_required_version.md)
