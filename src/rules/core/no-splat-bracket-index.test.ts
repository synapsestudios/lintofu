import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-splat-bracket-index.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-splat-bracket-index', rule, {
  valid: [
    { code: 'output "x" { value = aws_instance.example.*.id }' },
    { code: 'output "x" { value = aws_instance.example[0].id }' },
    { code: 'output "x" { value = aws_instance.example.*.id[count.index] }' },
    {
      code: 'output "x" { value = [for i in aws_instance.example : i.id][0] }',
    },
    { code: 'output "x" { value = var.list }' },
    { code: 'output "x" { value = var.list[0] }' },
  ],
  invalid: [
    {
      code: 'output "x" { value = aws_instance.example.*.id[0] }',
      errors: [{ messageId: 'splatBracketIndex' }],
    },
    {
      code: 'output "x" { value = var.list.*.name[1] }',
      errors: [{ messageId: 'splatBracketIndex' }],
    },
    {
      code: 'output "x" { value = "${aws_instance.example.*.id[0]}" }',
      errors: [{ messageId: 'splatBracketIndex' }],
    },
    {
      code: 'output "x" { value = [aws_instance.example.*.id[0]] }',
      errors: [{ messageId: 'splatBracketIndex' }],
    },
  ],
});
