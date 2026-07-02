# no-splat-bracket-index

Flag a constant index applied to a splat result, such as `aws_instance.example.*.id[0]`. This spelling is a pre-0.12 artifact from before Terraform indexed collections directly. Index the collection first and read the attribute from that element: `aws_instance.example[0].id`.

## Why

Before Terraform 0.12, a resource with `count` had no first-class list value, so configs reached an individual element through the attribute-splat idiom `resource.name.*.attr[0]`. Terraform 0.12 made `resource.name` a real list, so you can index it directly. The splat-then-index form still evaluates, so this is a style and upgrade concern rather than a correctness one. See the [0.12 upgrade guide](https://developer.hashicorp.com/terraform/language/v1.1.x/upgrade-guides/0-12).

## What it flags

```hcl
output "first_id" {
  value = aws_instance.example.*.id[0]   # flagged
}

output "second_name" {
  value = var.list.*.name[1]             # flagged
}
```

The same pattern inside string interpolation (`"${aws_instance.example.*.id[0]}"`) is also flagged.

## What it does not flag

- A splat with no trailing index: `aws_instance.example.*.id`.
- A normal indexed traversal with no splat: `aws_instance.example[0].id`.
- A non-constant index on a splat, e.g. `aws_instance.example.*.id[count.index]`, which is a dynamic lookup rather than the legacy constant-index idiom.
- A `for` expression that is then indexed: `[for i in aws_instance.example : i.id][0]`.

## Autofix

Report only. The recommended rewrite moves the index onto the collection before the attribute:

```hcl
aws_instance.example.*.id[0]   # before
aws_instance.example[0].id     # after
```

This rewrite is only mechanical in simple cases. The splat source and its per-element traversal can be arbitrarily nested, so an automatic fix risks producing something that no longer evaluates the same way. The rule reports the location and leaves the rewrite to you.

## Options

None.
