import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-legacy-security-group-rules.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-legacy-security-group-rules', rule, {
  valid: [
    {
      code: `resource "aws_vpc_security_group_ingress_rule" "allow_ssh" {
  security_group_id = aws_security_group.example.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}`,
    },
    {
      code: `resource "aws_vpc_security_group_egress_rule" "allow_all" {
  security_group_id = aws_security_group.example.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}`,
    },
    {
      code: `resource "aws_security_group" "example" {
  name = "example"
  timeouts {
    delete = "10m"
  }
}`,
    },
    {
      code: `resource "aws_s3_bucket" "example" {
  bucket = "example"
}`,
    },
  ],
  invalid: [
    {
      code: `resource "aws_security_group_rule" "allow_ssh" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.example.id
}`,
      errors: [{ messageId: 'legacySecurityGroupRule' }],
    },
    {
      code: `resource "aws_security_group" "example" {
  name = "example"
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`,
      errors: [{ messageId: 'legacySecurityGroupRule' }],
    },
    {
      code: `resource "aws_security_group" "example" {
  name = "example"
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`,
      errors: [{ messageId: 'legacySecurityGroupRule' }],
    },
    {
      code: `resource "aws_security_group" "example" {
  name = "example"
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`,
      errors: [
        { messageId: 'legacySecurityGroupRule' },
        { messageId: 'legacySecurityGroupRule' },
      ],
    },
  ],
});
