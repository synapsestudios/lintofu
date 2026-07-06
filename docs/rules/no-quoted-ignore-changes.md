# no-quoted-ignore-changes

Flag quoted string elements in a `lifecycle` `ignore_changes` list, such as `ignore_changes = ["ami"]`. Use bare attribute references instead: `ignore_changes = [ami, tags]`.

## Why

`ignore_changes` takes a list of attribute references, not strings. Terraform 0.12 introduced the bare reference form and deprecated the quoted spelling. The quoted form still parses, but it produces a deprecation warning and reads as a string literal rather than a reference to an attribute. See the [ignore_changes documentation](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle#ignore_changes).

## What it flags

```hcl
resource "aws_instance" "web" {
  lifecycle {
    ignore_changes = ["ami"]                        # flagged
    ignore_changes = ["ami", "tags"]                # both flagged
    ignore_changes = [ami, "tags"]                  # the quoted element flagged
    ignore_changes = ["network_interface[0].id"]    # flagged
  }
}
```

## What it does not flag

- Bare attribute references: `ignore_changes = [ami, tags]`.
- The bare `all` keyword: `ignore_changes = [all]`.
- An indexed bare reference: `ignore_changes = [tags["Name"]]`.
- An empty list: `ignore_changes = []`.
- The single quoted wildcard `ignore_changes = ["*"]`, which is owned by [no-legacy-ignore-changes-wildcard](./no-legacy-ignore-changes-wildcard.md).
- Interpolated elements such as `"${var.name}"`, which are owned by [prefer-bare-expression](./prefer-bare-expression.md).

## Autofix

Partial. An element whose string value is a valid attribute path is unquoted in place:

```hcl
ignore_changes = ["ami", "tags"]   # before
ignore_changes = [ami, tags]       # after
```

An element that is not a valid attribute path is reported without a fix. This covers a quoted `"*"` inside a multi-element list: the other elements are unquoted and the `"*"` is left for you to resolve.

## Options

None.
