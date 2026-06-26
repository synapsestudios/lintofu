# prefer-bare-expression

Flag the redundant `"${expr}"` wrapping pattern.

## Why

HCL 0.12 (Terraform 0.12, 2019) made the wrapping unnecessary: `x = var.foo` and `x = "${var.foo}"` are equivalent. The bare form is shorter, avoids implicit type coercion to string, and reads as exactly what it is. The wrapped form remains valid HCL and OpenTofu syntax and won't be removed; this rule expresses a style preference and has no bearing on compatibility.

hclsyntax emits a distinct `TemplateWrapExpr` node for this pattern (a template whose only part is a non-literal expression, with no surrounding text), so detection is exact, with no false positives on genuine templates.

## What it flags

```hcl
locals {
  a = "${var.foo}"                          # ❌ unwrap to `var.foo`
  b = "${aws_s3_bucket.b.arn}"              # ❌ unwrap
}
```

Accepted:

```hcl
locals {
  a = var.foo                               # ✅
  b = aws_s3_bucket.b.arn                   # ✅
  c = "prefix-${var.foo}"                   # ✅ genuine template, mixed content
  d = "${var.x}-${var.y}"                   # ✅ multiple interpolations
}
```

## Severity

Defaults to `warn` in the recommended config, because it expresses a stylistic preference and carries no correctness or compatibility impact.

## Options

None.
