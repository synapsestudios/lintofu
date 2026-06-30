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
    // Allowed refs inside a function call still pass.
    { code: destroyProvisioner('    command = format("%s", self.id)') },
    {
      code: destroyProvisioner(`    environment = {
      FOO = self.id
    }`),
    },
    // Allowed refs in both branches of a conditional still pass.
    { code: destroyProvisioner('    command = true ? self.id : count.index') },
    // A for-expression loop var used as a traversal root is locally bound,
    // not an external reference.
    {
      code: destroyProvisioner(
        '    command = join(",", [for x in self.triggers.items : x])',
      ),
    },
    // A splat over an allowed root passes.
    { code: destroyProvisioner('    command = self.x[*].id') },
    // A constant index over an allowed root folds into the traversal and passes.
    { code: destroyProvisioner('    command = self.x[0]') },
    // A non-constant index with an allowed collection and key passes.
    { code: destroyProvisioner('    command = self.x[count.index]') },
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
    {
      code: destroyProvisioner('    command = format("rm -rf %s", var.path)'),
      errors: [
        { messageId: 'disallowedReference', data: { name: 'var.path' } },
      ],
    },
    {
      code: destroyProvisioner('    command = upper(format("%s", local.x))'),
      errors: [{ messageId: 'disallowedReference', data: { name: 'local.x' } }],
    },
    // Refs hidden in a conditional's condition and true-result.
    {
      code: destroyProvisioner(
        '    command = var.cleanup ? local.cleanup_cmd : "true"',
      ),
      errors: [
        { messageId: 'disallowedReference', data: { name: 'var.cleanup' } },
        {
          messageId: 'disallowedReference',
          data: { name: 'local.cleanup_cmd' },
        },
      ],
    },
    // Ref hidden in a conditional's false-result.
    {
      code: destroyProvisioner('    command = true ? self.id : local.y'),
      errors: [{ messageId: 'disallowedReference', data: { name: 'local.y' } }],
    },
    // Ref hidden in a nested conditional's deepest branch.
    {
      code: destroyProvisioner(
        '    command = true ? self.id : true ? self.name : local.deep',
      ),
      errors: [
        { messageId: 'disallowedReference', data: { name: 'local.deep' } },
      ],
    },
    // Conditional nested inside a template interpolation.
    {
      code: destroyProvisioner('    command = "${var.a ? local.b : "c"}"'),
      errors: [
        { messageId: 'disallowedReference', data: { name: 'var.a' } },
        { messageId: 'disallowedReference', data: { name: 'local.b' } },
      ],
    },
    // Ref hidden in the collection of an object comprehension.
    {
      code: destroyProvisioner(
        `    environment = { for k, v in var.envs : k => v }`,
      ),
      errors: [
        { messageId: 'disallowedReference', data: { name: 'var.envs' } },
      ],
    },
    // Ref hidden in the collection of a list comprehension; the loop var s is
    // not flagged.
    {
      code: destroyProvisioner(
        '    command = join(",", [for s in var.list : s.secret])',
      ),
      errors: [
        { messageId: 'disallowedReference', data: { name: 'var.list' } },
      ],
    },
    // Ref hidden in the source of a splat.
    {
      code: destroyProvisioner('    command = aws_instance.x[*].id'),
      errors: [
        { messageId: 'disallowedReference', data: { name: 'aws_instance.x' } },
      ],
    },
    // Refs in both positions of a non-constant index expression.
    {
      code: destroyProvisioner('    command = var.commands[var.i]'),
      errors: [
        { messageId: 'disallowedReference', data: { name: 'var.commands' } },
        { messageId: 'disallowedReference', data: { name: 'var.i' } },
      ],
    },
    // Ref only in the key; the allowed collection self is not flagged.
    {
      code: destroyProvisioner('    command = self.triggers[var.idx]'),
      errors: [{ messageId: 'disallowedReference', data: { name: 'var.idx' } }],
    },
    // A constant index folds into the traversal; the disallowed root is still
    // flagged (this input previously crashed the rule on a null traverser).
    {
      code: destroyProvisioner('    command = var.commands[0]'),
      errors: [
        {
          messageId: 'disallowedReference',
          data: { name: 'var.commands[0]' },
        },
      ],
    },
  ],
});
