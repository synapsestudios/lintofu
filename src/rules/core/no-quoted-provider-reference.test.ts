import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-quoted-provider-reference.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-quoted-provider-reference', rule, {
  valid: [
    { code: 'resource "aws_instance" "web" { provider = aws.west }' },
    { code: 'data "aws_ami" "x" { provider = aws.west }' },
    {
      code: 'module "vpc" {\n  source = "./m"\n  providers = { aws = aws.west }\n}',
    },
    {
      code: 'module "vpc" {\n  source = "./m"\n  providers = { aws = aws.west, aws.alt = aws.east }\n}',
    },
    { code: 'resource "aws_instance" "web" { provider = "${aws.west}" }' },
  ],
  invalid: [
    {
      code: 'import {\n  to = aws_instance.web\n  id = "i-abc"\n  provider = "aws.west"\n}',
      output:
        'import {\n  to = aws_instance.web\n  id = "i-abc"\n  provider = aws.west\n}',
      errors: [{ messageId: 'quotedProviderReference' }],
    },
    {
      code: 'resource "aws_instance" "web" { provider = "aws west" }',
      output: null,
      errors: [{ messageId: 'quotedProviderReference' }],
    },
    {
      code: 'module "vpc" {\n  source = "./m"\n  providers = { "aws.alt" = aws.east }\n}',
      output:
        'module "vpc" {\n  source = "./m"\n  providers = { aws.alt = aws.east }\n}',
      errors: [{ messageId: 'quotedProviderReference' }],
    },
    {
      code: 'resource "aws_instance" "web" { provider = "aws.west" }',
      output: 'resource "aws_instance" "web" { provider = aws.west }',
      errors: [{ messageId: 'quotedProviderReference' }],
    },
    {
      code: 'data "aws_ami" "x" { provider = "aws" }',
      output: 'data "aws_ami" "x" { provider = aws }',
      errors: [{ messageId: 'quotedProviderReference' }],
    },
    {
      code: 'module "vpc" {\n  source = "./m"\n  providers = { aws = "aws.west" }\n}',
      output:
        'module "vpc" {\n  source = "./m"\n  providers = { aws = aws.west }\n}',
      errors: [{ messageId: 'quotedProviderReference' }],
    },
    {
      code: 'module "vpc" {\n  source = "./m"\n  providers = { "aws" = aws.west }\n}',
      output:
        'module "vpc" {\n  source = "./m"\n  providers = { aws = aws.west }\n}',
      errors: [{ messageId: 'quotedProviderReference' }],
    },
    {
      code: 'module "vpc" {\n  source = "./m"\n  providers = { "aws" = "aws.west" }\n}',
      output:
        'module "vpc" {\n  source = "./m"\n  providers = { aws = aws.west }\n}',
      errors: [
        { messageId: 'quotedProviderReference' },
        { messageId: 'quotedProviderReference' },
      ],
    },
  ],
});
