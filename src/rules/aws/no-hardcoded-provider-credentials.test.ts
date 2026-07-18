import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-hardcoded-provider-credentials.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-hardcoded-provider-credentials', rule, {
  valid: [
    { code: 'provider "aws" {\n  access_key = var.key\n}' },
    { code: 'provider "aws" {\n  access_key = ""\n}' },
    { code: 'provider "aws" {\n  secret_key = "${var.secret}"\n}' },
    { code: 'provider "google" {\n  access_key = "literal"\n}' },
    { code: 'provider "aws" {\n  region = "us-east-1"\n}' },
    {
      code: 'terraform {\n  backend "s3" {\n    access_key = var.key\n  }\n}',
    },
  ],
  invalid: [
    {
      code: 'provider "aws" {\n  access_key = "AKIAEXAMPLE"\n}',
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    {
      code: 'provider "aws" {\n  secret_key = "abc123"\n}',
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    {
      code: 'provider "aws" {\n  token = "sess"\n}',
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    {
      code: 'terraform {\n  backend "s3" {\n    access_key = "AKIAEXAMPLE"\n  }\n}',
      errors: [{ messageId: 'hardcodedCredential' }],
    },
  ],
});
