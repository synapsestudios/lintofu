# prefer-bare-expression

Flag the redundant `"${expr}"` wrapping pattern.

## Why

HCL 0.12 (Terraform 0.12, 2019) made the wrapping unnecessary — `x = var.foo` and `x = "${var.foo}"` are equivalent. The bare form is shorter, avoids implicit type coercion to string, and reads as exactly what it is. The wrapped form is not deprecated by HCL or OpenTofu and won't be removed; this rule is a style preference, not a compatibility issue.

hclsyntax emits a distinct `TemplateWrapExpr` node for this pattern (a template whose only part is a non-literal expression, with no surrounding text), so detection is exact — no false positives on genuine templates.

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
  c = "prefix-${var.foo}"                   # ✅ genuine template — mixed content
  d = "${var.x}-${var.y}"                   # ✅ multiple interpolations
}
```

## Severity

Defaults to `warn` in the recommended config — it's a stylistic preference rather than a correctness or compatibility issue.

## Options

None.
