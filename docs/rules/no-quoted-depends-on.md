# no-quoted-depends-on

Flag quoted string references in a `depends_on` list, such as `depends_on = ["aws_instance.example"]`. Write bare references instead: `depends_on = [aws_instance.example]`.

## Why

`depends_on` takes a list of references to other resources or modules. Terraform 0.11 accepted these as quoted strings, and later versions still parse that spelling as a compatibility shim while emitting a deprecation warning. The quoted form loses the connection to the referenced object and reads as an opaque string. A bare reference is the current form. See the [depends_on documentation](https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on).

## What it flags

```hcl
resource "aws_instance" "web" {
  depends_on = ["aws_instance.example"]        # flagged
}

resource "aws_instance" "web" {
  depends_on = [aws_instance.a, "aws_instance.b"]  # the quoted element is flagged
}
```

## What it does not flag

- Bare references: `depends_on = [aws_instance.example]`.
- The interpolation-wrapped form `depends_on = ["${aws_instance.example}"]`, which `prefer-bare-expression` reports.
- An empty list: `depends_on = []`.

## Autofix

Partial. An element whose string value is a single valid reference is unquoted in place:

```hcl
depends_on = ["aws_instance.example"]   # before
depends_on = [aws_instance.example]     # after
```

A quoted element whose content is not a valid reference (for example a literal with spaces) is reported without a fix, since there is no safe bare rewrite.

## Options

None.
