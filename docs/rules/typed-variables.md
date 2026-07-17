# typed-variables

Every `variable` block must declare a `type`.

## Why

An untyped variable accepts any value. Without a type constraint, a wrong-shaped input flows past the module boundary and fails deep inside a resource expression that consumes it, where the error message points at the wrong place and rarely names the variable. A `type` constraint rejects bad input where it enters the module and documents the interface the module expects.

## What it flags

A `variable` block with no `type` attribute:

```hcl
variable "region" {}                       # missing type
variable "region" { default = "value" }    # missing type
```

## What it does not flag

Any `variable` with a `type`, regardless of its form:

```hcl
variable "region" { type = string }
variable "region" { type = list(string) }
variable "region" { type = object({ n = string }) }
variable "region" { type = any }                 # explicit opt-out
```

`type = any` is accepted on purpose. It has the same runtime effect as omitting the type, but it states the intent to accept any value, whereas an omitted type leaves that intent unstated.

Quoted forms such as `type = "string"` still have a `type` attribute, so this rule stays silent; the quoted form is the concern of `no-quoted-type-constraints`. Blocks other than `variable` are ignored.

## Options

None.
