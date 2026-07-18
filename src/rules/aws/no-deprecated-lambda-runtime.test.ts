import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-deprecated-lambda-runtime.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-deprecated-lambda-runtime', rule, {
  valid: [
    {
      code: 'resource "aws_lambda_function" "f" {\n  runtime = "nodejs22.x"\n}',
    },
    {
      code: 'resource "aws_lambda_function" "f" {\n  runtime = "provided.al2023"\n}',
    },
    {
      code: 'resource "aws_lambda_function" "f" {\n  runtime = "java8.al2"\n}',
    },
    { code: 'resource "aws_lambda_function" "f" {\n  runtime = var.r\n}' },
    {
      code: 'resource "aws_lambda_layer_version" "l" {\n  compatible_runtimes = ["python3.13"]\n}',
    },
  ],
  invalid: [
    {
      code: 'resource "aws_lambda_function" "f" {\n  runtime = "java8"\n}',
      errors: [{ messageId: 'deprecatedRuntime' }],
    },
    {
      code: 'resource "aws_lambda_function" "f" {\n  runtime = "python3.9"\n}',
      errors: [{ messageId: 'deprecatedRuntime' }],
    },
    {
      code: 'resource "aws_lambda_function" "f" {\n  runtime = "go1.x"\n}',
      errors: [{ messageId: 'deprecatedRuntime' }],
    },
    {
      code: 'resource "aws_lambda_function" "f" {\n  runtime = "provided"\n}',
      errors: [{ messageId: 'deprecatedRuntime' }],
    },
    {
      code: 'resource "aws_lambda_layer_version" "l" {\n  compatible_runtimes = ["python3.9", "nodejs22.x"]\n}',
      errors: [{ messageId: 'deprecatedRuntime' }],
    },
  ],
});
