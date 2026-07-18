import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-api-gateway-deployment-stage-args.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-api-gateway-deployment-stage-args', rule, {
  valid: [
    {
      code: 'resource "aws_api_gateway_deployment" "this" {\n  rest_api_id = aws_api_gateway_rest_api.this.id\n}',
    },
    {
      code: 'resource "aws_api_gateway_stage" "this" {\n  stage_name = "prod"\n}',
    },
  ],
  invalid: [
    {
      code: 'resource "aws_api_gateway_deployment" "this" {\n  rest_api_id = aws_api_gateway_rest_api.this.id\n  stage_name  = "prod"\n}',
      errors: [
        { messageId: 'deploymentStageArg', data: { name: 'stage_name' } },
      ],
    },
    {
      code: 'resource "aws_api_gateway_deployment" "this" {\n  rest_api_id = aws_api_gateway_rest_api.this.id\n  canary_settings {\n    percent_traffic = 10\n  }\n}',
      errors: [
        { messageId: 'deploymentStageArg', data: { name: 'canary_settings' } },
      ],
    },
    {
      code: 'resource "aws_api_gateway_deployment" "this" {\n  rest_api_id     = aws_api_gateway_rest_api.this.id\n  canary_settings = {\n    percent_traffic = 10\n  }\n}',
      errors: [
        { messageId: 'deploymentStageArg', data: { name: 'canary_settings' } },
      ],
    },
    {
      code: 'resource "aws_api_gateway_deployment" "this" {\n  rest_api_id       = aws_api_gateway_rest_api.this.id\n  stage_name        = "prod"\n  stage_description = "prod stage"\n}',
      errors: [
        { messageId: 'deploymentStageArg' },
        { messageId: 'deploymentStageArg' },
      ],
    },
  ],
});
