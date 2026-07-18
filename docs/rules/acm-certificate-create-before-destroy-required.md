# acm-certificate-create-before-destroy-required

Flag a `resource "aws_acm_certificate"` block that does not set `lifecycle { create_before_destroy = true }`. Under the default destroy-before-create ordering, replacing an in-use certificate hangs `tofu apply` until timeout because ACM refuses to delete a certificate still attached to another resource.

## Why

Certificate replacement is common: adding a subject alternative name, switching validation methods, or any change to an immutable argument forces a new `aws_acm_certificate`. Under the default lifecycle, OpenTofu destroys the old certificate before creating its replacement. ACM blocks the delete while the certificate is still associated with an Application Load Balancer listener or a CloudFront distribution, so the apply stalls and eventually fails at the delete timeout.

Setting `create_before_destroy = true` reverses the order: the new certificate is created and attached first, then the old one is deleted once nothing references it. This is the recommended pattern for ACM certificates. See the [`aws_acm_certificate` resource docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate) and the [lifecycle meta-argument docs](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle).

## What it flags

An `aws_acm_certificate` resource that leaves the default destroy-before-create ordering in place:

```hcl
resource "aws_acm_certificate" "cert" {
  domain_name = "example.com"
  # no lifecycle block, flagged
}

resource "aws_acm_certificate" "cert" {
  lifecycle {
    create_before_destroy = false   # explicitly default ordering, flagged
  }
}
```

An empty `lifecycle {}` block and a `lifecycle` block that sets only `prevent_destroy = false` are both flagged, since neither turns on create-before-destroy.

## What it does not flag

- A resource with `lifecycle { create_before_destroy = true }`.
- A resource with `lifecycle { prevent_destroy = true }`. Replacement is blocked at plan time, so the apply cannot reach the hanging delete. This is exempt even without `create_before_destroy`.
- A non-literal value such as `create_before_destroy = var.cbd`, whose boolean value cannot be proven at lint time.
- `data "aws_acm_certificate"` blocks and other resource types.

## Autofix

None. Inserting a `lifecycle` block or a new argument is out of scope for an automatic fix. Add the block yourself:

```hcl
resource "aws_acm_certificate" "cert" {
  domain_name = "example.com"

  lifecycle {
    create_before_destroy = true
  }
}
```

## Options

None.
