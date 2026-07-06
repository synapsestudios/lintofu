# no-legacy-lookup

Flag a `lookup()` call with exactly two arguments, such as `lookup(var.tags, "Name")`. The two-argument form is equivalent to native index syntax, so write `var.tags["Name"]` instead.

## Why

`lookup()` originally took an optional third default argument. Omitting that default has been deprecated since Terraform 0.7, and the two-argument form does nothing that index syntax cannot. Index syntax is shorter and reads the same way as any other collection access. See the [lookup function docs](https://developer.hashicorp.com/terraform/language/functions/lookup).

## What it flags

```hcl
output "name" {
  value = lookup(var.tags, "Name")   # flagged
}

output "computed" {
  value = lookup(var.m, local.key)   # flagged
}
```

The same call inside string interpolation (`"${lookup(var.tags, "Name")}"`) is also flagged.

## What it does not flag

- A three-argument call that supplies a default: `lookup(var.m, "k", "default")`.
- The spread form `lookup(var.pair...)`, whose runtime arity is unknown.
- A namespaced provider function such as `provider::foo::lookup(a, b)`.
- An unrelated function such as `coalesce(var.a, var.b)`.
- Native index syntax that is already correct: `var.tags["Name"]`.

## Autofix

The fix rewrites `lookup(x, y)` to `x[y]` from the source text of the two arguments:

```hcl
lookup(var.tags, "Name")   # before
var.tags["Name"]           # after
```

The fix is provided in every flagged case. When the first argument is a conditional, binary, or unary expression, the fix wraps it in parentheses, since the index postfix `[...]` binds tighter than those operators. For example, `lookup(a ? b : c, "k")` becomes `(a ? b : c)["k"]`.

## Options

None.
