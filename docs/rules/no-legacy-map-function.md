# no-legacy-map-function

Flag the legacy `map(...)` function used to build a map literal. It was deprecated in Terraform 0.12 and removed in 0.15.

## Why

`map("a", 1, "b", 2)` took alternating key and value arguments and returned a map. Terraform 0.12 introduced first-class object and map syntax, deprecated the function, and 0.15 removed it. A config that still calls `map(...)` fails to parse on current Terraform. A brace object literal expresses the same value and reads more clearly. See the [Terraform 0.15 upgrade guide](https://developer.hashicorp.com/terraform/language/v1.1.x/upgrade-guides/0-15).

## What it flags

```hcl
output "tags" {
  value = map("Name", "app", "Env", var.env)   # flagged
}
```

Any call whose function name is exactly `map`.

## What it does not flag

- Object literals written with braces: `{ a = 1, b = 2 }`.
- `tomap({ a = 1 })`, which is a distinct function that is still supported.
- Other functions such as `merge`, `zipmap`, and `lookup`.
- A variable or attribute whose name contains `map`, such as `local.map` or `var.mapping`.
- The `map(...)` type constraint inside a `variable` block's `type`, such as `type = map(string)`. There it names a type, not the removed function.

## Autofix

Fixable when the rewrite is safe. The rule replaces the call with a brace object literal, pairing the alternating arguments into `key = value` entries. Values are copied from source verbatim. A string-literal key becomes a bare identifier when it is a valid identifier and a quoted key otherwise.

The fix applies only when the argument count is even, every key is a string literal, and no two keys are equal, so the pairing is unambiguous. Legacy `map` let a later duplicate key win, but a `{ a = 1, a = 2 }` object literal is a duplicate-attribute parse error, so a call with repeated literal keys reports without a fix. When a key is not a string literal, the argument count is odd, keys collide, or the final argument uses the `...` spread, the rule reports without a fix and you rewrite the call by hand.

## Options

None.
