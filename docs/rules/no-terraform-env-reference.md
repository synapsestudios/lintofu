# no-terraform-env-reference

Flag references to `terraform.env`. It was renamed to `terraform.workspace` when Terraform 0.10 replaced "environments" with "workspaces", and kept only as a deprecated alias before being dropped.

## Why

`terraform.env` reads as current code but points at a name that Terraform no longer supports. Anything relying on it silently resolves to an empty string on modern versions, so a config that looks environment-aware isn't. `terraform.workspace` is the supported spelling and means the same thing. See the [workspaces documentation](https://developer.hashicorp.com/terraform/cli/workspaces).

## What it flags

```hcl
output "env" {
  value = terraform.env               # ❌
}

resource "aws_s3_bucket" "b" {
  bucket = "app-${terraform.env}"      # ❌ also flagged inside interpolation
}
```

## What it does not flag

- `terraform.workspace` — the supported form.
- Any other `terraform.*` attribute (e.g. `terraform.environment`).
- A `var.env` reference or a bare `env`, which are unrelated names.

## Autofix

Fixable. The rule rewrites `terraform.env` to `terraform.workspace` in place, including inside string interpolation.

The fix replaces the whole reference. `terraform.env` is a plain string with no attributes or elements to index, so a trailing traversal (`terraform.env.foo`) or index (`terraform.env[0]`) is already invalid Terraform; the rule does not attempt to preserve such steps.

## Options

None.
