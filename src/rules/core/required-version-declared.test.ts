import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './required-version-declared.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('required-version-declared', rule, {
  valid: [
    {
      code: `terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}`,
    },
    {
      code: `terraform {
  required_version = ">= 1.5"
  required_providers = {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}`,
    },
    { code: 'terraform {}' },
    { code: 'resource "x" "y" { bucket = "b" }' },
    { code: 'terraform { required_version = ">= 1.5" }' },
    {
      code: `terraform {
  required_version = ">= 1.5"
}
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}`,
    },
  ],
  invalid: [
    {
      code: `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}`,
      errors: [{ messageId: 'missingRequiredVersion' }],
    },
    {
      code: `terraform {
  required_providers = {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}`,
      errors: [{ messageId: 'missingRequiredVersion' }],
    },
    {
      code: `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}`,
      errors: [
        { messageId: 'missingRequiredVersion' },
        { messageId: 'missingRequiredVersion' },
      ],
    },
    {
      code: `terraform {
  required_providers {}
}`,
      errors: [{ messageId: 'missingRequiredVersion' }],
    },
  ],
});
