# no-legacy-security-group-rules

Flag the legacy ways of declaring AWS security-group rules. Prefer `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule`.

## Why

The opentofu/aws provider docs for [`aws_security_group_rule`](https://api.opentofu.org/registry/docs/providers/opentofu/aws/v6.42.0/resources/security_group_rule.md) carry this alert:

> Avoid using the `aws_security_group_rule` resource, as it struggles with managing multiple CIDR blocks, and, due to the historical lack of unique IDs, tags and descriptions.

The same guidance applies to the inline `ingress {}` and `egress {}` blocks inside `aws_security_group`: they predate the dedicated rule resources and hit the same limitations. Mixing inline and standalone rules is also explicitly unsupported by the provider.

## What it flags

```hcl
resource "aws_security_group_rule" "allow_ssh" {  # ❌ legacy standalone rule
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.example.id
}

resource "aws_security_group" "example" {
  name = "example"
  ingress {                                       # ❌ inline ingress
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {                                        # ❌ inline egress
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

Accepted:

```hcl
resource "aws_security_group" "example" {
  name = "example"
}

resource "aws_vpc_security_group_ingress_rule" "allow_ssh" {    # ✅
  security_group_id = aws_security_group.example.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "allow_all" {     # ✅
  security_group_id = aws_security_group.example.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}
```

## Autofix

None. Migrating inline blocks and legacy `aws_security_group_rule` resources to the split resources is a non-trivial transformation (a single inline block may fan out into multiple new resources, one per CIDR).

## Options

None.
