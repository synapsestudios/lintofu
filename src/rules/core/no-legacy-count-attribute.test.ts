import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-legacy-count-attribute.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-legacy-count-attribute', rule, {
  valid: [
    { code: 'resource "aws_instance" "x" { count = 2 }' },
    { code: 'output "x" { value = length(aws_instance.example) }' },
    { code: 'output "x" { value = count.index }' },
    { code: 'output "x" { value = data.aws_ami.foo.count }' },
    { code: 'output "x" { value = var.count }' },
    { code: 'output "x" { value = local.count }' },
    { code: 'output "x" { value = module.vpc.count }' },
    { code: 'output "x" { value = each.count }' },
    { code: 'output "x" { value = self.count }' },
    { code: 'output "x" { value = path.count }' },
    { code: 'output "x" { value = terraform.count }' },
    { code: 'output "x" { value = aws_instance.example.id }' },
    { code: 'output "x" { value = aws_instance.example }' },
    { code: 'output "x" { value = aws_instance.example.count.foo }' },
    { code: 'output "x" { value = aws_instance.example[0].count }' },
    { code: 'output "x" { value = [for r in aws_instance.foo : r.count] }' },
  ],
  invalid: [
    {
      code: 'output "x" { value = aws_instance.example.count }',
      output: 'output "x" { value = length(aws_instance.example) }',
      errors: [{ messageId: 'legacyCountAttribute' }],
    },
    {
      code: 'output "x" { value = "${aws_instance.example.count}" }',
      output: 'output "x" { value = "${length(aws_instance.example)}" }',
      errors: [{ messageId: 'legacyCountAttribute' }],
    },
    {
      code: 'resource "aws_instance" "b" { count = aws_instance.a.count }',
      output: 'resource "aws_instance" "b" { count = length(aws_instance.a) }',
      errors: [{ messageId: 'legacyCountAttribute' }],
    },
    {
      code: 'output "x" { value = "${aws_instance.a.count}-${aws_instance.b.count}" }',
      output:
        'output "x" { value = "${length(aws_instance.a)}-${length(aws_instance.b)}" }',
      errors: [
        { messageId: 'legacyCountAttribute' },
        { messageId: 'legacyCountAttribute' },
      ],
    },
  ],
});
