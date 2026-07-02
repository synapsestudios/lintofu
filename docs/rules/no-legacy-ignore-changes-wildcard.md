# no-legacy-ignore-changes-wildcard

Flag the quoted `"*"` wildcard in a `lifecycle` `ignore_changes` list. Terraform 0.15 replaced it with the unquoted `all` keyword and removed the quoted form.

## Why

Early Terraform accepted `ignore_changes = ["*"]` to ignore changes to every attribute. Terraform 0.15 introduced the bare `all` keyword for that meaning and dropped the quoted `"*"` spelling. A config that keeps `["*"]` reads as a wildcard but now describes a single attribute literally named `*`, so it no longer ignores every attribute. See the [Terraform 0.15 upgrade guide](https://developer.hashicorp.com/terraform/language/v1.1.x/upgrade-guides/0-15).

## What it flags

```hcl
resource "aws_instance" "x" {
  lifecycle {
    ignore_changes = ["*"]   # flagged
  }
}
```

## What it does not flag

- `ignore_changes = all`, the supported keyword.
- A list of concrete attribute names, such as `ignore_changes = ["ami", "tags"]` or `ignore_changes = [ami, tags]`.
- An empty list, `ignore_changes = []`.
- A list where `"*"` sits alongside other elements, such as `["*", "ami"]`. The rule only matches a single-element `["*"]` list, which keeps the wildcard meaning unambiguous and avoids a false positive on a mixed list.

## Autofix

Fixable. The rule replaces the whole `["*"]` expression with the bare keyword `all`.

## Options

None.
