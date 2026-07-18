import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-provider-version-constraint.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-provider-version-constraint', rule, {
  valid: [
    { code: 'provider "aws" {\n  region = "us-east-1"\n}' },
    {
      code: 'terraform {\n  required_providers {\n    aws = {\n      source  = "hashicorp/aws"\n      version = "~> 5.0"\n    }\n  }\n}',
    },
    { code: 'resource "aws_instance" "web" {\n  version = "1.0"\n}' },
  ],
  invalid: [
    {
      code: 'provider "aws" {\n  region  = "us-east-1"\n  version = "~> 5.0"\n}',
      errors: [
        {
          messageId: 'providerVersionConstraint',
          data: { provider: 'aws' },
        },
      ],
    },
    {
      code: 'provider "aws" {\n  alias   = "west"\n  version = "5.0.0"\n}',
      errors: [
        {
          messageId: 'providerVersionConstraint',
          data: { provider: 'aws' },
        },
      ],
    },
  ],
});
