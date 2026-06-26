# module-source-pinned

Every `module` block must pin its source via one of:

- a local path (`./...` or `../...`), which needs no pin because paths are already reproducible
- a git-style URL containing `?ref=<ref>` (a git tag or SHA)
- a registry source paired with a sibling `version` attribute

## Why

Unpinned module sources are a common source of "worked on my machine, broke in CI" outcomes for OpenTofu projects. Pinning is cheap and makes `tofu init` deterministic.

## What it flags

```hcl
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"            # ❌ no version
}
module "tools" {
  source = "git::https://example.com/tools.git"       # ❌ no ref
}
```

Accepted:

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "3.0.0"                                   # ✅
}
module "tools" {
  source = "git::https://example.com/tools.git?ref=v2" # ✅
}
module "local" {
  source = "./modules/local"                           # ✅ paths are reproducible
}
```

Dynamic sources (`source = var.x`) are skipped, since the rule can't inspect them at lint time.

## Options

None.
