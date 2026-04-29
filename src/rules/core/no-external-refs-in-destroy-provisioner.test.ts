import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-external-refs-in-destroy-provisioner.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

function destroyProvisioner(body: string): string {
  return `resource "null_resource" "x" {
  provisioner "local-exec" {
    when = destroy
${body}
  }
}`;
}

tester.run('no-external-refs-in-destroy-provisioner', rule, {
  valid: [
    { code: destroyProvisioner('    command = self.id') },
    { code: destroyProvisioner('    command = self.triggers.x') },
    { code: destroyProvisioner('    command = count.index') },
    { code: destroyProvisioner('    command = each.key') },
    { code: destroyProvisioner('    command = each.value') },
    {
      code: destroyProvisioner(`    command = self.id
    connection {
      host = self.private_ip
    }`),
    },
    {
      code: `resource "null_resource" "x" {
  provisioner "local-exec" {
    when    = create
    command = "\${var.foo}"
  }
}`,
    },
    {
      code: `resource "null_resource" "x" {
  provisioner "local-exec" {
    command = "\${var.foo}"
  }
}`,
    },
    // Quoted `when = "destroy"` is deliberately not detected; left to
    // `tofu validate`. Documented in docs/rules/no-external-refs-in-destroy-provisioner.md.
    {
      code: `resource "null_resource" "x" {
  provisioner "local-exec" {
    when    = "destroy"
    command = "\${var.foo}"
  }
}`,
    },
    // FunctionCallExpr surfaces as UnknownExpr; the rule cannot see through
    // it. Listed under "Limitations" in the rule doc.
    { code: destroyProvisioner('    command = format("%s", local.x)') },
    {
      code: destroyProvisioner(`    environment = {
      FOO = self.id
    }`),
    },
  ],
  invalid: [
    {
      code: destroyProvisioner('    command = "${var.foo}"'),
      errors: [{ messageId: 'disallowedReference', data: { name: 'var.foo' } }],
    },
    {
      code: destroyProvisioner('    command = count'),
      errors: [{ messageId: 'disallowedReference', data: { name: 'count' } }],
    },
    {
      code: destroyProvisioner('    command = each'),
      errors: [{ messageId: 'disallowedReference', data: { name: 'each' } }],
    },
    {
      code: destroyProvisioner('    command = count.foo'),
      errors: [
        { messageId: 'disallowedReference', data: { name: 'count.foo' } },
      ],
    },
    {
      code: destroyProvisioner('    command = each.other'),
      errors: [
        { messageId: 'disallowedReference', data: { name: 'each.other' } },
      ],
    },
    {
      code: destroyProvisioner('    command = local.x'),
      errors: [{ messageId: 'disallowedReference', data: { name: 'local.x' } }],
    },
    {
      code: destroyProvisioner(
        '    command = data.aws_caller_identity.current.account_id',
      ),
      errors: [
        {
          messageId: 'disallowedReference',
          data: { name: 'data.aws_caller_identity.current.account_id' },
        },
      ],
    },
    {
      code: destroyProvisioner('    command = aws_instance.bar.id'),
      errors: [
        {
          messageId: 'disallowedReference',
          data: { name: 'aws_instance.bar.id' },
        },
      ],
    },
    {
      code: destroyProvisioner('    command = path.module'),
      errors: [
        { messageId: 'disallowedReference', data: { name: 'path.module' } },
      ],
    },
    {
      code: destroyProvisioner('    command = terraform.workspace'),
      errors: [
        {
          messageId: 'disallowedReference',
          data: { name: 'terraform.workspace' },
        },
      ],
    },
    {
      code: destroyProvisioner(`    command = self.id
    connection {
      host = var.foo
    }`),
      errors: [{ messageId: 'disallowedReference', data: { name: 'var.foo' } }],
    },
    {
      code: destroyProvisioner('    command = "echo ${var.foo}"'),
      errors: [{ messageId: 'disallowedReference', data: { name: 'var.foo' } }],
    },
    {
      code: destroyProvisioner(`    environment = {
      FOO = var.foo
    }`),
      errors: [{ messageId: 'disallowedReference', data: { name: 'var.foo' } }],
    },
  ],
});
