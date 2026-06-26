# documented-outputs

Every `output` block must have a non-empty `description`.

## Why

Outputs are the public API of a module. Consumers depend on them to understand what a module surfaces; undocumented outputs force readers to infer intent from the expression.

## What it flags

```hcl
output "bucket_arn" { value = aws_s3_bucket.b.arn }               # ❌ missing
output "bucket_arn" { value = "x"  description = "" }             # ❌ empty
output "bucket_arn" { value = "x"  description = "ARN of bucket" } # ✅
```

Dynamic descriptions (interpolations referencing other values) are accepted, since the rule can't judge whether a computed value is meaningful.

## Options

None.
