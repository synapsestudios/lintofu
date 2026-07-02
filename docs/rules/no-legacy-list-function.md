# no-legacy-list-function

Flag the legacy `list(...)` function used to build a list literal. Terraform 0.12 deprecated it in favor of the `[...]` tuple syntax, and 0.15 removed it.

## Why

`list(a, b)` predates the first-class tuple syntax that Terraform 0.12 introduced. The function still reads as current code, but a configuration that calls it fails to parse on Terraform 0.15 and later. The bracket form `[a, b]` produces the same value and is the supported spelling. See the [Terraform 0.15 upgrade guide](https://developer.hashicorp.com/terraform/language/v1.1.x/upgrade-guides/0-15).

## What it flags

```hcl
output "ports" {
  value = list(80, 443)          # flagged
}

output "empty" {
  value = list()                 # flagged
}

output "nested" {
  value = concat(list("a"), list("b"))   # both calls flagged
}
```

A call is flagged when its function name is exactly `list`, including the zero-argument `list()`.

## What it does not flag

- A bracket tuple literal such as `[80, 443]` or `[]`.
- Any other function: `concat`, `tolist`, `flatten`, `coalescelist`, or a user name like `mylist(...)`.
- A variable or attribute whose name merely contains the substring `list`, such as `var.list` or `local.list_of_things`.

## Autofix

Fixable. The rule rewrites `list(...)` to a `[...]` tuple, splicing the original argument text between the brackets so element expressions, commas, and whitespace are preserved. `list()` becomes `[]`.

When a list TYPE is required rather than a tuple, the equivalent is `tolist([...])`. The autofix always produces the plain tuple, which Terraform converts to a list wherever a list is expected.

The one case the rule reports without a fix is a spread call such as `list(items...)`. A `...` spread has no tuple-literal equivalent, so the rule leaves the rewrite to you.

## Options

None.
