# no-mixed-security-group-rule-forms

Warn when a standalone security-group rule (modern or legacy) targets an `aws_security_group` that also defines inline `ingress {}` or `egress {}` blocks.

## Why

The AWS provider supports two styles for attaching rules to an `aws_security_group`:

- Inline `ingress {}` / `egress {}` blocks inside the `aws_security_group` resource.
- Standalone rule resources: `aws_vpc_security_group_ingress_rule`, `aws_vpc_security_group_egress_rule`, or the legacy `aws_security_group_rule`.

Mixing the two styles against the same security group causes inconsistent state changes and appears as drift on every plan. The provider documentation is explicit about this being unsupported.

This is distinct from [`no-legacy-security-group-rules`](./no-legacy-security-group-rules.md): you can disable that rule (tolerating the legacy forms) and still want a warning when the two forms coexist.

## What it flags

```hcl
resource "aws_security_group" "example" {
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_vpc_security_group_ingress_rule" "allow_ssh" {  # ⚠
  security_group_id = aws_security_group.example.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}
```

The warning is emitted on the standalone rule resource. The `aws_security_group` may live in a different `.tf` file within the same module directory.

## Scope

Cross-file resolution covers every `.tf` and `.tofu` file in the same directory as the file being linted, which matches OpenTofu's own module boundary (a module is all files in a directory). Subdirectories and files referenced via `module "foo" { source = "./bar" }` are not traversed.

Files excluded from linting via `ignores` but present in the same directory still participate in cross-resource resolution. Move such files outside the module directory if you need them fully excluded.

## Autofix

None. Consolidating onto one style is a design decision, not a mechanical transformation.

## Options

None.
