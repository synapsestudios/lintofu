import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-legacy-ignore-changes-wildcard.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

function resource(body: string): string {
  return `resource "aws_instance" "x" {\n  lifecycle {\n    ${body}\n  }\n}`;
}

tester.run('no-legacy-ignore-changes-wildcard', rule, {
  valid: [
    { code: resource('ignore_changes = all') },
    { code: resource('ignore_changes = [ami, tags]') },
    { code: resource('ignore_changes = ["ami", "tags"]') },
    { code: resource('ignore_changes = []') },
    { code: resource('ignore_changes = ["*", "ami"]') },
    { code: resource('ignore_changes = ["${var.name}"]') },
    { code: resource('create_before_destroy = true') },
    { code: 'resource "aws_instance" "x" {\n  tags = ["*"]\n}' },
  ],
  invalid: [
    {
      code: resource('ignore_changes = ["*"]'),
      output: resource('ignore_changes = all'),
      errors: [{ messageId: 'legacyIgnoreChangesWildcard' }],
    },
    {
      code: 'resource "aws_db_instance" "d" {\n  lifecycle {\n    ignore_changes = ["*"]\n  }\n}',
      output:
        'resource "aws_db_instance" "d" {\n  lifecycle {\n    ignore_changes = all\n  }\n}',
      errors: [{ messageId: 'legacyIgnoreChangesWildcard' }],
    },
  ],
});
