# no-template-provider

Flag use of the archived `hashicorp/template` provider. Prefer the built-in `templatefile()` function or the `cloudinit_config` data source from the `hashicorp/cloudinit` provider.

## Why

The [`hashicorp/template`](https://registry.terraform.io/providers/hashicorp/template/latest) provider is archived and no longer maintained. Its features have either been folded into the language (`templatefile()` replaces `data "template_file"` and `data "template_dir"`) or moved to a maintained provider (`cloudinit_config` from `hashicorp/cloudinit` replaces `data "template_cloudinit_config"`). New configurations should not depend on it.

## What it flags

```hcl
data "template_file" "rendered" {                # ❌
  template = file("${path.module}/init.sh")
  vars     = { name = "world" }
}

data "template_dir" "configs" {                  # ❌
  source_dir      = "${path.module}/templates"
  destination_dir = "${path.cwd}/rendered"
}

data "template_cloudinit_config" "user_data" {   # ❌
  part {
    content_type = "text/cloud-config"
    content      = "hostname: example"
  }
}

terraform {
  required_providers {
    template = {                                 # ❌
      source  = "hashicorp/template"
      version = "~> 2.2"
    }
  }
}
```

Accepted:

```hcl
locals {
  init = templatefile("${path.module}/init.sh", { name = "world" })   # ✅
}

terraform {
  required_providers {
    cloudinit = {
      source  = "hashicorp/cloudinit"
      version = "~> 2.3"
    }
  }
}

data "cloudinit_config" "user_data" {                                  # ✅
  part {
    content_type = "text/cloud-config"
    content      = "hostname: example"
  }
}
```

## Autofix

None. Migrating `data.template_file.x.rendered` references to inline `templatefile(...)` calls touches arbitrary callers and isn't a safe local rewrite. Migrating `template_cloudinit_config` requires also adding the `cloudinit` provider to `required_providers` and renaming the data source.

## Options

None.
