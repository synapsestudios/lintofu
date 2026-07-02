# no-legacy-count-attribute

Flag references to the legacy `.count` attribute of a resource, such as `aws_instance.example.count`. Terraform 0.12 removed this attribute. Use `length(aws_instance.example)` to read the number of instances a counted resource produced.

## Why

Before Terraform 0.12 a counted resource exposed a `.count` attribute that returned how many instances existed. Terraform 0.12 removed it in favor of standard collection handling: a counted resource is a list, so `length(<type>.<name>)` returns the same number. A config that still reads `<type>.<name>.count` fails to evaluate on modern Terraform. See the [0.12 upgrade guide](https://developer.hashicorp.com/terraform/language/v1.1.x/upgrade-guides/0-12).

## What it flags

```hcl
output "instance_count" {
  value = aws_instance.example.count          # flagged
}

resource "aws_instance" "b" {
  count = aws_instance.a.count                 # flagged, including inside interpolation
}
```

A reference is flagged when it reads as `<type>.<name>.count`: a resource type root, a resource name, then `.count`.

## What it does not flag

- The `count` meta-argument on the left of an assignment (`count = 2`). That is a block attribute, not a reference.
- `count.index`, the index of the current instance inside a counted resource.
- Named-scope roots: `var.count`, `local.count`, `module.vpc.count`, `data.aws_ami.foo.count`, `each.count`, `self.count`, `path.count`, and `terraform.count`.
- Any other resource attribute, such as `aws_instance.example.id`.
- A deeper or indexed traversal, such as `aws_instance.example.count.foo` or `aws_instance.example[0].count`, which is a different shape and not the removed top-level attribute.

## Autofix

Fixable. The rule rewrites `<type>.<name>.count` to `length(<type>.<name>)` in place, including inside string interpolation. The type and name are plain identifiers, so the rewrite is a straight textual substitution.

## Options

None.
