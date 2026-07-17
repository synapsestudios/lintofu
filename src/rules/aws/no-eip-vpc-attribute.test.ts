import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-eip-vpc-attribute.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-eip-vpc-attribute', rule, {
  valid: [
    { code: 'resource "aws_eip" "nat" {\n  domain = "vpc"\n}' },
    { code: 'resource "aws_eip" "nat" {}' },
    { code: 'data "aws_eip" "existing" {\n  vpc = true\n}' },
    { code: 'resource "aws_instance" "web" {\n  vpc = true\n}' },
    { code: 'variable "vpc" {\n  default = true\n}' },
  ],
  invalid: [
    {
      code: 'resource "aws_eip" "nat" {\n  vpc = true\n}',
      output: 'resource "aws_eip" "nat" {\n  domain = "vpc"\n}',
      errors: [{ messageId: 'eipVpcAttribute' }],
    },
    {
      code: 'resource "aws_eip" "nat" {\n  vpc = true\n  domain = "vpc"\n}',
      output: null,
      errors: [{ messageId: 'eipVpcAttribute' }],
    },
    {
      code: 'resource "aws_eip" "nat" {\n  vpc = false\n  tags = { Name = "nat" }\n}',
      output: 'resource "aws_eip" "nat" {\n  tags = { Name = "nat" }\n}',
      errors: [{ messageId: 'eipVpcAttribute' }],
    },
    {
      code: 'resource "aws_eip" "nat" {\n  vpc = false\n}',
      output: 'resource "aws_eip" "nat" {\n}',
      errors: [{ messageId: 'eipVpcAttribute' }],
    },
    {
      code: 'resource "aws_eip" "nat" { vpc = false }',
      output: 'resource "aws_eip" "nat" {}',
      errors: [{ messageId: 'eipVpcAttribute' }],
    },
    {
      code: 'resource "aws_eip" "nat" {\r\n  vpc = false\r\n}',
      output: 'resource "aws_eip" "nat" {\r\n}',
      errors: [{ messageId: 'eipVpcAttribute' }],
    },
    {
      code: 'resource "aws_eip" "nat" {\n  vpc = false # keep\n}',
      output: null,
      errors: [{ messageId: 'eipVpcAttribute' }],
    },
    {
      code: 'resource "aws_eip" "nat" {\n  vpc = var.in_vpc\n}',
      output: null,
      errors: [{ messageId: 'eipVpcAttribute' }],
    },
    {
      code: 'resource "aws_eip" "nat" {\n  vpc = local.enabled ? true : false\n}',
      output: null,
      errors: [{ messageId: 'eipVpcAttribute' }],
    },
  ],
});
