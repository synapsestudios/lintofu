# no-quoted-type-constraints

Flag quoted type constraints in a `variable` block, such as `type = "string"` or `type = "list"`. Terraform 0.12 introduced unquoted type keywords, and the quoted forms became an error in Terraform 0.15.

## Why

A quoted type constraint is a string literal that happens to spell a type name. Terraform 0.11 accepted `type = "string"`, `type = "list"`, and `type = "map"`, but 0.12 replaced them with unquoted keywords and richer type expressions like `list(string)` and `object({...})`. The quoted forms were accepted as a deprecated compatibility shim through 0.12 to 0.14, then removed in 0.15, so a config that still quotes its types fails to parse on current Terraform. See the [0.15 upgrade guide](https://developer.hashicorp.com/terraform/language/v1.1.x/upgrade-guides/0-15).

## What it flags

An all-literal string assigned to a `type` attribute inside a `variable` block, where the string is one of `string`, `list`, `map`, `number`, `bool`, `set`, `object`, `any`, or `tuple`.

```hcl
variable "name" {
  type = "string"     # flagged
}

variable "tags" {
  type = "list"       # flagged
}
```

## What it does not flag

- Unquoted keyword forms such as `type = string` or `type = list(string)`.
- An interpolated or otherwise dynamic type expression such as `type = "${local.t}"`.
- A quoted string that is not a type keyword, such as `type = "custom"`.
- A `type` attribute outside a `variable` block, or any other attribute that happens to hold a type name.

## Autofix

Fixable for the forms that have a bare keyword equivalent. The rule rewrites the quoted primitive to its unquoted keyword: `"string"` becomes `string`, `"number"` becomes `number`, `"bool"` becomes `bool`, and `"any"` becomes `any`. The legacy `"list"` meant a list of strings, so it becomes `list(string)`; `"map"` becomes `map(string)` and `"set"` becomes `set(string)`.

`"object"` and `"tuple"` are flagged without an autofix. A bare `object` or `tuple` keyword is not a valid type on its own (each requires a type argument, for example `object({ name = string })`), so the rule reports these for a human to rewrite rather than emit a broken replacement.

## Options

None.
