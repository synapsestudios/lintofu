# no-quoted-provider-reference

Flag a provider reference written as a quoted string, such as `provider = "aws.west"` or a quoted key or value in a module `providers` map. Write the reference as a bare traversal: `provider = aws.west`.

## Why

A provider reference names a provider configuration, so it is a traversal like `aws.west`, not a string. Terraform routes a quoted reference through its 0.11 compatibility shim and emits a "quoted references are deprecated" warning while decoding the configuration. The shim acts on native quoted strings only, so an interpolated value is left alone. Drop the quotes to address the reference directly.

## What it flags

```hcl
resource "aws_instance" "web" {
  provider = "aws.west"          # flagged
}

data "aws_ami" "x" {
  provider = "aws"               # flagged
}

module "vpc" {
  source    = "./m"
  providers = { aws = "aws.west" }   # flagged value
}

module "vpc" {
  source    = "./m"
  providers = { "aws" = aws.west }   # flagged key
}
```

Both sides of a `providers` entry are checked, so `{ "aws" = "aws.west" }` reports twice.

## What it does not flag

- A bare `provider` argument: `provider = aws.west`.
- A bare `providers` map: `providers = { aws = aws.west }`.
- A bare qualified key: `providers = { aws.alt = aws.east }`.
- An interpolated value: `provider = "${aws.west}"`, which is a template rather than a native quoted string.

## Autofix

Fixable. The fix strips the surrounding quotes:

```hcl
provider = "aws.west"          # before
provider = aws.west            # after
```

The quotes are removed only when the contents form a valid bare reference (an identifier with optional dotted steps for a value, a single identifier for a key). A quoted string whose contents are not a valid reference is reported without a fix.

## Options

None.
