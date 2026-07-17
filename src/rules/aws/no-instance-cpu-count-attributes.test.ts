import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-instance-cpu-count-attributes.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-instance-cpu-count-attributes', rule, {
  valid: [
    {
      code: `resource "aws_instance" "web" {
  instance_type = "t3.micro"
  cpu_options {
    core_count = 2
  }
}`,
    },
    {
      code: `resource "aws_instance" "web" {
  instance_type = "t3.micro"
}`,
    },
    {
      code: `resource "aws_launch_template" "web" {
  cpu_core_count = 2
}`,
    },
    {
      code: `data "aws_instance" "web" {
  cpu_core_count = 2
}`,
    },
  ],
  invalid: [
    {
      code: `resource "aws_instance" "web" {
  instance_type = "t3.micro"
  cpu_core_count = 2
}`,
      output: `resource "aws_instance" "web" {
  instance_type = "t3.micro"
  cpu_options {
    core_count = 2
  }
}`,
      errors: [
        {
          messageId: 'cpuCountAttribute',
          data: { attribute: 'cpu_core_count', replacement: 'core_count' },
        },
      ],
    },
    {
      code: `resource "aws_instance" "web" {
  instance_type = "t3.micro"
  cpu_threads_per_core = 1
}`,
      output: `resource "aws_instance" "web" {
  instance_type = "t3.micro"
  cpu_options {
    threads_per_core = 1
  }
}`,
      errors: [
        {
          messageId: 'cpuCountAttribute',
          data: {
            attribute: 'cpu_threads_per_core',
            replacement: 'threads_per_core',
          },
        },
      ],
    },
    {
      code: `resource "aws_instance" "web" {
  instance_type = "t3.micro"
  cpu_core_count = 2
  cpu_threads_per_core = 1
}`,
      output: `resource "aws_instance" "web" {
  instance_type = "t3.micro"
  cpu_options {
    core_count = 2
    threads_per_core = 1
  }
}`,
      errors: [
        {
          messageId: 'cpuCountAttribute',
          data: { attribute: 'cpu_core_count', replacement: 'core_count' },
        },
        {
          messageId: 'cpuCountAttribute',
          data: {
            attribute: 'cpu_threads_per_core',
            replacement: 'threads_per_core',
          },
        },
      ],
    },
    {
      code: `resource "aws_instance" "web" {
  cpu_core_count = var.cores
}`,
      output: null,
      errors: [
        {
          messageId: 'cpuCountAttribute',
          data: { attribute: 'cpu_core_count', replacement: 'core_count' },
        },
      ],
    },
    {
      code: `resource "aws_instance" "web" {
  cpu_core_count = 2
  cpu_options {
    threads_per_core = 1
  }
}`,
      output: null,
      errors: [
        {
          messageId: 'cpuCountAttribute',
          data: { attribute: 'cpu_core_count', replacement: 'core_count' },
        },
      ],
    },
    {
      code: `resource "aws_instance" "web" {
  cpu_core_count = 2
  cpu_threads_per_core = var.threads
}`,
      output: null,
      errors: [
        {
          messageId: 'cpuCountAttribute',
          data: { attribute: 'cpu_core_count', replacement: 'core_count' },
        },
        {
          messageId: 'cpuCountAttribute',
          data: {
            attribute: 'cpu_threads_per_core',
            replacement: 'threads_per_core',
          },
        },
      ],
    },
    {
      code: `resource "aws_instance" "web" {
    instance_type = "t3.micro"
    cpu_core_count = 2
    cpu_threads_per_core = 1
}`,
      output: `resource "aws_instance" "web" {
    instance_type = "t3.micro"
    cpu_options {
      core_count = 2
      threads_per_core = 1
    }
}`,
      errors: [
        {
          messageId: 'cpuCountAttribute',
          data: { attribute: 'cpu_core_count', replacement: 'core_count' },
        },
        {
          messageId: 'cpuCountAttribute',
          data: {
            attribute: 'cpu_threads_per_core',
            replacement: 'threads_per_core',
          },
        },
      ],
    },
    {
      code: `resource "aws_instance" "web" {
  cpu_core_count = 2
  cpu_threads_per_core = 1
  instance_type = "t3.micro"
}`,
      output: `resource "aws_instance" "web" {
  cpu_options {
    core_count = 2
    threads_per_core = 1
  }
  instance_type = "t3.micro"
}`,
      errors: [
        {
          messageId: 'cpuCountAttribute',
          data: { attribute: 'cpu_core_count', replacement: 'core_count' },
        },
        {
          messageId: 'cpuCountAttribute',
          data: {
            attribute: 'cpu_threads_per_core',
            replacement: 'threads_per_core',
          },
        },
      ],
    },
    {
      code: `resource "aws_instance" "web" {
  cpu_threads_per_core = 1
  cpu_core_count = 2
}`,
      output: `resource "aws_instance" "web" {
  cpu_options {
    core_count = 2
    threads_per_core = 1
  }
}`,
      errors: [
        {
          messageId: 'cpuCountAttribute',
          data: {
            attribute: 'cpu_threads_per_core',
            replacement: 'threads_per_core',
          },
        },
        {
          messageId: 'cpuCountAttribute',
          data: { attribute: 'cpu_core_count', replacement: 'core_count' },
        },
      ],
    },
  ],
});
