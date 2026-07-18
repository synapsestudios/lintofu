import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-eks-addon-resolve-conflicts.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-eks-addon-resolve-conflicts', rule, {
  valid: [
    {
      code: 'resource "aws_eks_addon" "vpc_cni" {\n  resolve_conflicts_on_create = "OVERWRITE"\n  resolve_conflicts_on_update = "PRESERVE"\n}',
    },
    {
      code: 'resource "aws_eks_addon" "vpc_cni" {\n  addon_name = "vpc-cni"\n}',
    },
    {
      code: 'resource "aws_eks_cluster" "main" {\n  resolve_conflicts = "OVERWRITE"\n}',
    },
    {
      code: 'data "aws_eks_addon" "existing" {\n  resolve_conflicts = "OVERWRITE"\n}',
    },
  ],
  invalid: [
    {
      code: 'resource "aws_eks_addon" "vpc_cni" {\n  resolve_conflicts = "OVERWRITE"\n}',
      errors: [{ messageId: 'resolveConflicts' }],
    },
  ],
});
