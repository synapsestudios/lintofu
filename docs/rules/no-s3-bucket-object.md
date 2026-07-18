# no-s3-bucket-object

Flag the deprecated `aws_s3_bucket_object` resource, the `aws_s3_bucket_object` data source, and the `aws_s3_bucket_objects` data source. Use `aws_s3_object` (resource and singular data source) and `aws_s3_objects` (plural data source) instead.

## Why

The AWS provider renamed these types for naming consistency with the wider S3 resource set. `aws_s3_bucket_object` is a deprecated alias for `aws_s3_object`, and `aws_s3_bucket_objects` is a deprecated alias for `aws_s3_objects`. The aliases still parse today but carry a deprecation notice and are slated for removal, so config that keeps using them will break on a future provider major version. See the [`aws_s3_bucket_object` resource docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object) and the [`aws_s3_object` resource docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object).

## What it flags

- A `resource "aws_s3_bucket_object"` block.
- A `data "aws_s3_bucket_object"` block.
- A `data "aws_s3_bucket_objects"` block.

```hcl
resource "aws_s3_bucket_object" "doc" {
  bucket = "example"
  key    = "index.html"
}
```

## What it does not flag

- `resource "aws_s3_object"` and `data "aws_s3_objects"` blocks, which are the current types.
- `resource "aws_s3_bucket_object_lock_configuration"`, a separate, non-deprecated type whose name shares the `aws_s3_bucket_object` prefix.

## Autofix

None. Renaming the resource type changes its address, so OpenTofu plans a destroy and recreate of the object. A safe migration renames the type in config and then runs a state move or an import so the existing object keeps its state. That step is manual, so this rule reports without a fix.

## Options

None.
