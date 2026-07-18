import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './acm-certificate-create-before-destroy-required.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('acm-certificate-create-before-destroy-required', rule, {
  valid: [
    {
      code: 'resource "aws_acm_certificate" "cert" {\n  lifecycle {\n    create_before_destroy = true\n  }\n}',
    },
    {
      code: 'resource "aws_acm_certificate" "cert" {\n  lifecycle {\n    prevent_destroy = true\n  }\n}',
    },
    {
      code: 'resource "aws_acm_certificate" "cert" {\n  lifecycle {\n    create_before_destroy = var.cbd\n  }\n}',
    },
    {
      code: 'resource "aws_instance" "web" {\n  lifecycle {\n    create_before_destroy = false\n  }\n}',
    },
    {
      code: 'data "aws_acm_certificate" "existing" {\n  domain = "example.com"\n}',
    },
  ],
  invalid: [
    {
      code: 'resource "aws_acm_certificate" "cert" {\n  domain_name = "example.com"\n}',
      errors: [{ messageId: 'missingCreateBeforeDestroy' }],
    },
    {
      code: 'resource "aws_acm_certificate" "cert" {\n  lifecycle {\n  }\n}',
      errors: [{ messageId: 'missingCreateBeforeDestroy' }],
    },
    {
      code: 'resource "aws_acm_certificate" "cert" {\n  lifecycle {\n    create_before_destroy = false\n  }\n}',
      errors: [{ messageId: 'missingCreateBeforeDestroy' }],
    },
    {
      code: 'resource "aws_acm_certificate" "cert" {\n  lifecycle {\n    prevent_destroy = false\n  }\n}',
      errors: [{ messageId: 'missingCreateBeforeDestroy' }],
    },
  ],
});
