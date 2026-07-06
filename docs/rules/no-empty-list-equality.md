# no-empty-list-equality

Flag a comparison against an empty tuple literal, such as `var.list == []` or `var.list != []`. The comparison never matches a list, set, or map value, so it silently returns the wrong result. Use `length(var.list) == 0` instead.

## Why

`[]` builds a `tuple([])` value. The `==` operator returns true only when both operands have the same type, and a `list`, `set`, or `map` value never shares a type with `tuple([])`. So `var.list == []` is always false and `var.list != []` is always true, even when `var.list` is actually empty. A config like `count = var.list == [] ? 0 : 1` always takes the else branch, and nothing reports at plan time. Measuring the length avoids the type mismatch: `length(var.list) == 0` is true for any empty collection.

## What it flags

```hcl
output "is_empty" {
  value = var.list == []   # flagged
}

output "has_items" {
  value = var.list != []   # flagged
}
```

The empty tuple on either side is flagged, so `[] == var.list` is caught too.

## What it does not flag

- A length check: `length(var.list) == 0`.
- A comparison of two non-tuple expressions: `var.a == var.b`.
- A comparison with a non-empty tuple: `var.list == [1]`.
- A comparison with an empty string: `var.a == ""`, which is a valid string test.

## Autofix

The non-literal operand is wrapped in `length()` and compared to `0`, keeping the operator:

```hcl
var.list == []   # before
length(var.list) == 0   # after

var.list != []   # before
length(var.list) != 0   # after
```

When both operands are `[]` (`[] == []`) there is no expression to measure, so the rule reports without a fix.

## Options

None.
