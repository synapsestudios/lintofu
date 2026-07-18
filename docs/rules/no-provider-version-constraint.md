# no-provider-version-constraint

Flag a `version` argument inside a `provider` block. Declaring a provider version in the provider block is deprecated in Terraform and OpenTofu, and it only takes effect when `terraform.required_providers` omits a constraint for that provider.

## Why

Provider version constraints belong in `terraform.required_providers`. The in-block `version` argument is a legacy form that the version listed in `required_providers` overrides whenever both are present, so it silently does nothing in most configurations. Keeping the constraint in one place, `required_providers`, keeps the source of truth clear across every provider. See the [Terraform provider configuration docs](https://developer.hashicorp.com/terraform/language/providers/configuration) and the [OpenTofu provider configuration docs](https://opentofu.org/docs/language/providers/configuration/).

## What it flags

A `version` argument inside any `provider` block:

```hcl
provider "aws" {
  region  = "us-east-1"
  version = "~> 5.0"     # deprecated, flagged
}
```

The block is flagged even when it declares an `alias`:

```hcl
provider "aws" {
  alias   = "west"
  version = "5.0.0"      # deprecated, flagged
}
```

## What it does not flag

- A `provider` block with no `version` argument.
- A `version` argument declared in `terraform.required_providers`, which is the correct place for it:

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

- A `version` argument on any other block kind, such as a resource whose schema happens to include a `version` attribute.

## Autofix

None. Safe removal depends on whether `terraform.required_providers` already constrains this provider, and that declaration may live in another file that this single-file linter does not resolve. Removing the argument without a matching constraint in `required_providers` would drop the version pin entirely, so the rule reports the argument and leaves the fix to you.

## Options

None.
