# no-bool-as-count

Flag a `count` meta-argument set to a boolean value. Terraform 0.12 removed the automatic coercion from `bool` to `number`, so `count` now needs a number.

## Why

Before Terraform 0.12, `count = true` coerced to `1` and `count = false` coerced to `0`. Terraform 0.12 dropped that coercion, and a boolean `count` now fails at plan time. The supported form is a numeric conditional such as `count = var.enabled ? 1 : 0`. See the [0.12 upgrade guide](https://developer.hashicorp.com/terraform/language/v1.1.x/upgrade-guides/0-12).

## What it flags

A `count` attribute inside a `resource`, `data`, or `module` block whose value is provably a boolean:

```hcl
resource "aws_instance" "web" {
  count = true                 # boolean literal, flagged

  count = !var.disabled        # logical NOT, flagged

  count = var.env == "prod"    # comparison, flagged

  count = var.a && var.b       # logical AND, flagged
}
```

A value is provably boolean when it is a boolean literal, a `!` (logical NOT) expression, or a comparison or logical expression (`==`, `!=`, `>`, `>=`, `<`, `<=`, `&&`, `||`). Grouping parentheses around such an expression are seen through.

## What it does not flag

- Numeric literals: `count = 0`, `count = 2`.
- A conditional already in numeric form: `count = var.enabled ? 1 : 0`.
- `length(...)` or arithmetic: `count = length(var.items)`, `count = var.n + 1`.
- A bare variable reference such as `count = var.enabled`. Its type cannot be proven at lint time, and it is often a numeric `count` variable, so flagging it would produce false positives.

The rule reports only values it can prove are boolean. This keeps it quiet on numeric `count` variables at the cost of missing a bare boolean variable, which cannot be told apart from a numeric one without type information.

## Autofix

Fixable. A boolean literal is rewritten to a number: `count = true` becomes `count = 1` and `count = false` becomes `count = 0`. A provable-boolean expression is wrapped as a numeric conditional: `count = var.env == "prod"` becomes `count = (var.env == "prod") ? 1 : 0`.

## Options

None.
