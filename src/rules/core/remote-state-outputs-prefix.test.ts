import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './remote-state-outputs-prefix.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('remote-state-outputs-prefix', rule, {
  valid: [
    {
      code: 'output "x" { value = data.terraform_remote_state.network.outputs.vpc_id }',
    },
    {
      code: 'output "x" { value = data.terraform_remote_state.network.outputs.subnets[0] }',
    },
    { code: 'output "x" { value = data.terraform_remote_state.network }' },
    { code: 'output "x" { value = data.aws_ami.ubuntu.id }' },
    { code: 'output "x" { value = terraform_remote_state.network.vpc_id }' },
    { code: 'output "x" { value = var.terraform_remote_state }' },
  ],
  invalid: [
    {
      code: 'output "x" { value = data.terraform_remote_state.network.vpc_id }',
      output:
        'output "x" { value = data.terraform_remote_state.network.outputs.vpc_id }',
      errors: [{ messageId: 'missingOutputsPrefix' }],
    },
    {
      code: 'output "x" { value = "${data.terraform_remote_state.network.vpc_id}" }',
      output:
        'output "x" { value = "${data.terraform_remote_state.network.outputs.vpc_id}" }',
      errors: [{ messageId: 'missingOutputsPrefix' }],
    },
    {
      code: 'output "x" { value = data.terraform_remote_state.network.subnets[0] }',
      output:
        'output "x" { value = data.terraform_remote_state.network.outputs.subnets[0] }',
      errors: [{ messageId: 'missingOutputsPrefix' }],
    },
    {
      code: 'output "x" { value = data.terraform_remote_state.network.vpc.cidr }',
      output:
        'output "x" { value = data.terraform_remote_state.network.outputs.vpc.cidr }',
      errors: [{ messageId: 'missingOutputsPrefix' }],
    },
    {
      code: 'output "x" { value = "${data.terraform_remote_state.a.x}-${data.terraform_remote_state.b.y}" }',
      output:
        'output "x" { value = "${data.terraform_remote_state.a.outputs.x}-${data.terraform_remote_state.b.outputs.y}" }',
      errors: [
        { messageId: 'missingOutputsPrefix' },
        { messageId: 'missingOutputsPrefix' },
      ],
    },
  ],
});
