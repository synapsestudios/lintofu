# no-s3-bucket-inline-config

Flag deprecated inline configuration on `aws_s3_bucket`. Prefer the dedicated standalone `aws_s3_bucket_*` resources.

## Why

The opentofu/aws provider docs for [`aws_s3_bucket`](https://api.opentofu.org/registry/docs/providers/opentofu/aws/v6.42.0/resources/s3_bucket.md) mark a large set of inline arguments and blocks as deprecated, each pointing at a dedicated resource:

> Use the resource `aws_s3_bucket_acl` instead.

The migration has a rough history worth knowing. In provider v4.0 through v4.8 these inline arguments became read-only, which broke a lot of configs. v4.9.0 reverted that so they are writable again, but only drift-detected when actually set. They remain deprecation-marked through v5 and v6 and will be removed in a future major version.

The practical hazard today: configuring the same aspect both inline and through a standalone resource produces perpetual diffs, since both the bucket and the standalone resource try to own that setting. Moving each aspect onto its dedicated `aws_s3_bucket_*` resource avoids the drift and gets you off the deprecated path before removal.

## What it flags

Deprecated inline attributes (`acl`, `policy`, `request_payer`, `acceleration_status`):

```hcl
resource "aws_s3_bucket" "b" {
  bucket = "b"
  acl    = "private"   # use aws_s3_bucket_acl
}
```

Deprecated inline blocks (`grant`, `cors_rule`, `lifecycle_rule`, `logging`, `object_lock_configuration`, `replication_configuration`, `server_side_encryption_configuration`, `versioning`, `website`):

```hcl
resource "aws_s3_bucket" "b" {
  bucket = "b"
  versioning {         # use aws_s3_bucket_versioning
    enabled = true
  }
}
```

The same blocks generated with `dynamic`:

```hcl
resource "aws_s3_bucket" "b" {
  bucket = "b"
  dynamic "cors_rule" {   # use aws_s3_bucket_cors_configuration
    for_each = var.rules
    content {}
  }
}
```

Accepted:

```hcl
resource "aws_s3_bucket" "b" {
  bucket              = "b"
  object_lock_enabled = true   # only the object_lock_configuration block is deprecated
  lifecycle {                  # meta-argument, distinct from the lifecycle_rule block
    ignore_changes = [tags]
  }
}

resource "aws_s3_bucket_versioning" "b" {   # standalone resource
  bucket = aws_s3_bucket.b.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

## Autofix

None. Splitting inline configuration into standalone resources is a non-trivial multi-resource migration (each aspect moves to its own resource, wired back to the bucket by id), so the fix is left to a human.

## Options

None.
