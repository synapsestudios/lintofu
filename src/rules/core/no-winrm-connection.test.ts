import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-winrm-connection.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-winrm-connection', rule, {
  valid: [
    {
      code: `resource "aws_instance" "web" {
  connection {
    type = "ssh"
    host = self.public_ip
  }
}`,
    },
    {
      code: `resource "aws_instance" "web" {
  connection {
    host = self.public_ip
  }
}`,
    },
    {
      code: `resource "aws_instance" "web" {
  connection {
    type = "\${var.conn_type}"
    host = self.public_ip
  }
}`,
    },
    {
      code: `resource "some_thing" "x" {
  type = "winrm"
}`,
    },
    { code: 'data "aws_caller_identity" "current" {}' },
    {
      code: `resource "aws_instance" "web" {
  connection {
    type = "WinRM"
    host = self.public_ip
  }
}`,
    },
  ],
  invalid: [
    {
      code: `resource "aws_instance" "web" {
  provisioner "remote-exec" {
    connection {
      type     = "winrm"
      host     = self.public_ip
      user     = "Administrator"
    }
    inline = ["echo hi"]
  }
}`,
      errors: [{ messageId: 'winrmConnection' }],
    },
    {
      code: `resource "aws_instance" "web" {
  connection {
    type = "winrm"
    host = self.public_ip
  }
}`,
      errors: [{ messageId: 'winrmConnection' }],
    },
  ],
});
