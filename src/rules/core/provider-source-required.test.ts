import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './provider-source-required.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('provider-source-required', rule, {
  valid: [
    { code: 'terraform {}' },
    {
      code: `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}`,
    },
    { code: 'resource "x" "y" { bucket = "b" }' },
    {
      code: `terraform {
  required_providers = {
    aws     = { source = "hashicorp/aws", version = "~> 5.0" }
    google  = { source = "hashicorp/google" }
  }
}`,
    },
  ],
  invalid: [
    {
      code: `terraform {
  required_providers {
    aws = {
      version = "~> 5.0"
    }
  }
}`,
      errors: [{ messageId: 'missingSource', data: { name: 'aws' } }],
    },
    {
      code: `terraform {
  required_providers {
    azurerm = "~> 2.0"
  }
}`,
      errors: [{ messageId: 'legacyStringForm', data: { name: 'azurerm' } }],
    },
    {
      code: `terraform {
  required_providers = {
    aws = {
      version = "~> 5.0"
    }
  }
}`,
      errors: [{ messageId: 'missingSource', data: { name: 'aws' } }],
    },
    {
      code: `terraform {
  required_providers = {
    azurerm = "~> 2.0"
  }
}`,
      errors: [{ messageId: 'legacyStringForm', data: { name: 'azurerm' } }],
    },
    {
      code: `terraform {
  required_providers {
    azurerm = "~> 2.0"
    aws = {
      version = "~> 5.0"
    }
  }
}`,
      errors: [
        { messageId: 'legacyStringForm', data: { name: 'azurerm' } },
        { messageId: 'missingSource', data: { name: 'aws' } },
      ],
    },
  ],
});
