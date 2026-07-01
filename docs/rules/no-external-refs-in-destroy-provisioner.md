# no-external-refs-in-destroy-provisioner

Flag references to anything other than `self`, `count.index`, or `each.key`/`each.value` inside `provisioner` blocks with `when = destroy`.

## Why

OpenTofu (and Terraform since 0.13) rejects any reference inside a destroy-time provisioner that isn't `self`, `count.index`, `each.key`, or `each.value`. See the [0.13 upgrade guide](https://developer.hashicorp.com/terraform/language/v1.1.x/upgrade-guides/0-13). The same restriction applies to the provisioner's nested `connection` block.

`tofu validate` catches this at plan time. This rule surfaces the same error in the editor and in pre-commit, so you find out before you run a plan.

## What it flags

```hcl
resource "null_resource" "x" {
  provisioner "local-exec" {
    when    = destroy
    command = "${var.foo}"                  # ❌ var.foo
  }
}

resource "aws_instance" "y" {
  provisioner "remote-exec" {
    when = destroy
    connection {
      host = var.bastion_ip                 # ❌ var.bastion_ip
    }
  }
}

resource "null_resource" "z" {
  provisioner "local-exec" {
    when    = destroy
    command = "echo ${local.cleanup_target}" # ❌ local.cleanup_target
  }
}
```

Accepted:

```hcl
resource "null_resource" "x" {
  count = 3

  provisioner "local-exec" {
    when    = destroy
    command = "echo ${self.id} ${count.index}"   # ✅
  }

  provisioner "remote-exec" {
    when = destroy
    connection {
      host = self.private_ip                     # ✅
    }
  }
}
```

When you need a value at destroy time that isn't on `self`, stash it on a `null_resource`'s `triggers` and read it through `self.triggers.*`:

```hcl
resource "null_resource" "cleanup" {
  triggers = {
    bucket_name = aws_s3_bucket.data.bucket
  }

  provisioner "local-exec" {
    when    = destroy
    command = "aws s3 rb s3://${self.triggers.bucket_name}"
  }
}
```

## Limitations

The rule only matches the bareword `when = destroy`. The quoted form `when = "destroy"` is not detected; OpenTofu accepts the bareword form, and the quoted form is left to `tofu validate`.

## Autofix

None. The recommended workaround (move the value onto a `null_resource`'s `triggers`) is not a safe local rewrite.

## Options

None.
