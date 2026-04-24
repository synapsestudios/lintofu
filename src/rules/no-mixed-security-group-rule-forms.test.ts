import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import plugin from "../index.js";
import { initialize } from "../parser/index.js";
import rule from "./no-mixed-security-group-rule-forms.js";

RuleTester.describe = describe as unknown as typeof RuleTester.describe;
RuleTester.it = it as unknown as typeof RuleTester.it;

await initialize();

const tester = new RuleTester({
	plugins: { lintofu: plugin },
	language: "lintofu/opentofu",
});

tester.run("no-mixed-security-group-rule-forms", rule, {
	valid: [
		{
			code: `resource "aws_security_group" "foo" {
  name = "foo"
}
resource "aws_vpc_security_group_ingress_rule" "r" {
  security_group_id = aws_security_group.foo.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}`,
		},
		{
			code: `resource "aws_vpc_security_group_ingress_rule" "r" {
  security_group_id = aws_security_group.missing.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}`,
		},
		{
			code: `resource "aws_vpc_security_group_ingress_rule" "r" {
  security_group_id = "sg-12345"
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}`,
		},
	],
	invalid: [
		{
			code: `resource "aws_security_group" "foo" {
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
resource "aws_vpc_security_group_ingress_rule" "r" {
  security_group_id = aws_security_group.foo.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}`,
			errors: [{ messageId: "mixedForms" }],
		},
		{
			code: `resource "aws_security_group" "foo" {
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
resource "aws_vpc_security_group_egress_rule" "r" {
  security_group_id = aws_security_group.foo.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}`,
			errors: [{ messageId: "mixedForms" }],
		},
		{
			code: `resource "aws_security_group" "foo" {
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
resource "aws_security_group_rule" "r" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.foo.id
}`,
			errors: [{ messageId: "mixedForms" }],
		},
	],
});
