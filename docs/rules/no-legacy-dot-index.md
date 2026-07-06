# no-legacy-dot-index

Flag the pre-0.12 dot forms for indexing and splatting: a numeric dot index such as `list.0` and an attribute-only splat such as `aws_instance.web.*.id`. Use the bracket index `list[0]` and the full splat `aws_instance.web[*].id` instead.

## Why

Before Terraform 0.12, an element was reached with a numeric dot (`list.0`) and every element of a `count` resource with an attribute splat (`resource.name.*.attr`). Terraform 0.12 introduced the bracket index `list[0]` and the full splat `resource.name[*].attr`, and the modern grammar treats these as the canonical forms. The dot spellings still evaluate, so this is a style and upgrade concern rather than a correctness one. See the [0.12 upgrade guide](https://developer.hashicorp.com/terraform/language/v1.1.x/upgrade-guides/0-12).

## What it flags

```hcl
output "first" {
  value = list.0                    # flagged, fixes to list[0]
}

output "id" {
  value = aws_instance.web.0.id     # flagged, fixes to aws_instance.web[0].id
}

output "ids" {
  value = aws_instance.web.*.id     # flagged, fixes to aws_instance.web[*].id
}

output "all" {
  value = var.list.*                # flagged, fixes to var.list[*]
}
```

## What it does not flag

- A bracket index: `list[0]`, `aws_instance.web[0].id`.
- A full splat: `aws_instance.web[*].id`.
- A string index: `var.map["key"]`.
- Attribute access, since a dot followed by a name is not an index: `list.name`.

## Autofix

Numeric dot indices are always rewritten to bracket form, since `.0` and `[0]` are equivalent:

```hcl
list.0                  # before
list[0]                 # after
```

Attribute splats are rewritten to full splats:

```hcl
aws_instance.web.*.id   # before
aws_instance.web[*].id  # after
```

The splat rewrite is skipped when a constant index follows the splat, as in `aws_instance.web.*.id[0]`. There `.*.id[0]` indexes the collected list while `[*].id[0]` would index each element, so the two forms are not equivalent. The rule still reports the legacy `.*`, and [no-splat-bracket-index](./no-splat-bracket-index.md) reports the trailing constant index separately.

## Options

None.
