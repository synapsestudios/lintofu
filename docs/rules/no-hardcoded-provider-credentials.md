# no-hardcoded-provider-credentials

Flag literal `access_key`, `secret_key`, or `token` values inside a `provider "aws"` block or an s3 `backend` block. A credential written directly into HCL is committed with the repository and stays in its git history.

## Why

An access key, secret key, or session token pasted into a provider or backend block ships with every clone of the repository and remains in the git history even after a later edit removes it. Anyone with read access to the repository, or to any fork or backup of it, holds the credential. Rotating it becomes the only remedy.

The AWS provider reads these values from the environment, a shared credentials file, an assumed role, or OIDC federation when they are absent from the configuration. See the [AWS provider docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs) and the [s3 backend docs](https://opentofu.org/docs/language/settings/backends/s3/) for the supported sources.

## What it flags

A literal, non-empty string assigned to `access_key`, `secret_key`, or `token` in a `provider "aws"` block:

```hcl
provider "aws" {
  access_key = "AKIAEXAMPLE"   # flagged
  secret_key = "abc123"        # flagged
}
```

The same arguments in an s3 `backend` block:

```hcl
terraform {
  backend "s3" {
    access_key = "AKIAEXAMPLE"  # flagged
  }
}
```

## What it does not flag

- Variable references such as `access_key = var.key`.
- Interpolated templates such as `secret_key = "${var.secret}"`.
- Function calls whose result is not a literal string.
- An empty string, such as `access_key = ""`.
- These arguments on any other provider, such as `provider "google"`.

## Autofix

None. There is no safe automatic rewrite, since the correct source for the credential depends on how the project supplies secrets.

## Options

None.
