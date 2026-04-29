import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-legacy-provider-proxy.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-legacy-provider-proxy', rule, {
  valid: [
    { code: 'resource "x" "y" { bucket = "b" }' },
    {
      code: `provider "aws" {
  alias  = "alt"
  region = "us-west-2"
}`,
    },
    {
      code: `provider "aws" {
  region = "us-west-2"
}`,
    },
    {
      code: `provider "aws" {
  alias = "alt"
  assume_role {
    role_arn = "arn:aws:iam::123:role/x"
  }
}`,
    },
    { code: 'provider "aws" {}' },
    {
      code: `provider "aws" {
  alias = var.alias_name
}`,
    },
  ],
  invalid: [
    {
      code: `provider "aws" {
  alias = "alt"
}`,
      errors: [
        {
          messageId: 'legacyProviderProxy',
          data: { provider: 'aws', alias: 'alt' },
        },
      ],
    },
    {
      code: `provider "aws" {
  alias = "alt"
}
provider "aws" {
  alias = "failover"
}`,
      errors: [
        {
          messageId: 'legacyProviderProxy',
          data: { provider: 'aws', alias: 'alt' },
        },
        {
          messageId: 'legacyProviderProxy',
          data: { provider: 'aws', alias: 'failover' },
        },
      ],
    },
  ],
});
