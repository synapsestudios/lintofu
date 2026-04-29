import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-template-provider.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-template-provider', rule, {
  valid: [
    { code: 'data "aws_caller_identity" "current" {}' },
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
    {
      code: `terraform {
  required_providers {
    template = {
      source = "\${var.tpl_source}"
    }
  }
}`,
    },
    { code: 'terraform {}' },
    {
      code: `terraform {
  required_providers {
    foo = {
      source = "hashicorp/template-foo"
    }
  }
}`,
    },
  ],
  invalid: [
    {
      code: `data "template_file" "rendered" {
  template = file("\${path.module}/init.sh")
  vars = {
    name = "world"
  }
}`,
      errors: [{ messageId: 'useTemplatefile' }],
    },
    {
      code: `data "template_dir" "configs" {
  source_dir      = "\${path.module}/templates"
  destination_dir = "\${path.cwd}/rendered"
}`,
      errors: [{ messageId: 'useTemplatefile' }],
    },
    {
      code: `data "template_cloudinit_config" "user_data" {
  gzip          = true
  base64_encode = true
  part {
    content_type = "text/cloud-config"
    content      = "hostname: example"
  }
}`,
      errors: [{ messageId: 'useCloudinitProvider' }],
    },
    {
      code: `terraform {
  required_providers {
    template = {
      source  = "hashicorp/template"
      version = "~> 2.2"
    }
  }
}`,
      errors: [{ messageId: 'archivedTemplateProvider' }],
    },
    {
      code: `terraform {
  required_providers {
    tpl = {
      source = "hashicorp/template"
    }
  }
}`,
      errors: [{ messageId: 'archivedTemplateProvider' }],
    },
    {
      code: `terraform {
  required_providers {
    template = {
      source = "registry.terraform.io/hashicorp/template"
    }
  }
}`,
      errors: [{ messageId: 'archivedTemplateProvider' }],
    },
  ],
});
