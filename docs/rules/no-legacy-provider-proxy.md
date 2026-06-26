# no-legacy-provider-proxy

Flag empty `provider` blocks whose only attribute is `alias`. These are the pre-0.15 way for a child module to declare it accepts an aliased provider from its caller. Replace them with `configuration_aliases` inside `terraform.required_providers`.

## Why

The legacy form looks like a real provider configuration but configures nothing. Readers can't tell the block is a placeholder; tooling that processes provider configs treats it as one anyway. The modern form moves the declaration into `required_providers`, where it sits alongside the source and version constraint, and where its purpose is unambiguous. See the [Terraform 0.15 upgrade guide](https://developer.hashicorp.com/terraform/language/v1.1.x/upgrade-guides/0-15) for the original deprecation.

## What it flags

```hcl
provider "aws" {                 # ❌ legacy proxy block
  alias = "alt"
}
```

Replacement:

```hcl
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.alt]
    }
  }
}
```

## What it does not flag

- Real aliased providers that carry actual configuration (`region`, nested `assume_role`, etc.).
- Default provider blocks with no `alias`.
- Empty provider blocks with no attributes at all.
- Blocks where `alias` is set to a non-literal value (e.g. `var.alias_name`); rules can't infer the alias name to suggest a replacement.

## Limitations

The rule cannot tell whether the file belongs to a root module or a child module. In a root module, `provider "aws" { alias = "x" }` is technically legal, since it declares an alias that inherits the default configuration. If you have such a case on purpose, disable the rule for that file or block.

## Autofix

None. Migrating the declaration into `required_providers` requires touching another block (and possibly another file), and the right `source` and `version` constraints are caller-specific.

## Options

None.
