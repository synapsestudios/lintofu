import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-quoted-ignore-changes.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

function resource(body: string): string {
  return `resource "aws_instance" "web" {\n  lifecycle {\n    ${body}\n  }\n}`;
}

tester.run('no-quoted-ignore-changes', rule, {
  valid: [
    { code: resource('ignore_changes = [ami, tags]') },
    { code: resource('ignore_changes = [all]') },
    { code: resource('ignore_changes = ["*"]') },
    { code: resource('ignore_changes = []') },
    { code: resource('ignore_changes = [tags["Name"]]') },
    { code: resource('ignore_changes = ["${var.name}"]') },
    { code: resource('ignore_changes = ["prefix-${var.name}"]') },
    { code: resource('ignore_changes = all') },
    { code: resource('prevent_destroy = true') },
    { code: 'resource "aws_instance" "web" { ignore_changes = ["ami"] }' },
  ],
  invalid: [
    {
      code: resource('ignore_changes = ["ami"]'),
      output: resource('ignore_changes = [ami]'),
      errors: [{ messageId: 'quotedIgnoreChanges' }],
    },
    {
      code: resource('ignore_changes = ["ami", "tags"]'),
      output: resource('ignore_changes = [ami, tags]'),
      errors: [
        { messageId: 'quotedIgnoreChanges' },
        { messageId: 'quotedIgnoreChanges' },
      ],
    },
    {
      code: resource('ignore_changes = [ami, "tags"]'),
      output: resource('ignore_changes = [ami, tags]'),
      errors: [{ messageId: 'quotedIgnoreChanges' }],
    },
    {
      code: resource('ignore_changes = ["network_interface[0].id"]'),
      output: resource('ignore_changes = [network_interface[0].id]'),
      errors: [{ messageId: 'quotedIgnoreChanges' }],
    },
    {
      code: resource('ignore_changes = ["tags[\\"Name\\"]"]'),
      output: resource('ignore_changes = [tags["Name"]]'),
      errors: [{ messageId: 'quotedIgnoreChanges' }],
    },
    {
      code: resource('ignore_changes = ["ami", "*"]'),
      output: resource('ignore_changes = [ami, "*"]'),
      errors: [
        { messageId: 'quotedIgnoreChanges' },
        { messageId: 'quotedIgnoreChanges' },
      ],
    },
  ],
});
