import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-legacy-dot-index.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-legacy-dot-index', rule, {
  valid: [
    { code: 'output "x" { value = list[0] }' },
    { code: 'output "x" { value = aws_instance.web[0].id }' },
    { code: 'output "x" { value = aws_instance.web[*].id }' },
    { code: 'output "x" { value = list.name }' },
    { code: 'output "x" { value = var.map["key"] }' },
    { code: 'output "x" { value = var.list[*] }' },
  ],
  invalid: [
    {
      code: 'output "x" { value = list.0 }',
      output: 'output "x" { value = list[0] }',
      errors: [{ messageId: 'dotIndex' }],
    },
    {
      code: 'output "x" { value = aws_instance.web.0.id }',
      output: 'output "x" { value = aws_instance.web[0].id }',
      errors: [{ messageId: 'dotIndex' }],
    },
    {
      code: 'output "x" { value = aws_instance.web.*.id }',
      output: 'output "x" { value = aws_instance.web[*].id }',
      errors: [{ messageId: 'dotSplat' }],
    },
    {
      code: 'output "x" { value = aws_instance.web.*.id[0] }',
      output: null,
      errors: [{ messageId: 'dotSplat' }],
    },
    {
      code: 'output "x" { value = var.list.* }',
      output: 'output "x" { value = var.list[*] }',
      errors: [{ messageId: 'dotSplat' }],
    },
    {
      code: 'output "x" { value = (var.list).0 }',
      output: 'output "x" { value = (var.list)[0] }',
      errors: [{ messageId: 'dotIndex' }],
    },
    {
      code: 'output "x" { value = "${list.0}" }',
      output: 'output "x" { value = "${list[0]}" }',
      errors: [{ messageId: 'dotIndex' }],
    },
    {
      code: 'output "x" { value = aws_instance.web.*.id.0 }',
      output: 'output "x" { value = aws_instance.web.*.id[0] }',
      errors: [{ messageId: 'dotSplat' }, { messageId: 'dotIndex' }],
    },
  ],
});
