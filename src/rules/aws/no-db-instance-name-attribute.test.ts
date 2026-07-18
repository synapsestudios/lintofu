import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-db-instance-name-attribute.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-db-instance-name-attribute', rule, {
  valid: [
    { code: 'resource "aws_db_instance" "app" {\n  db_name = "app"\n}' },
    { code: 'data "aws_db_instance" "app" {\n  name = "app"\n}' },
    { code: 'resource "aws_instance" "web" {\n  name = "app"\n}' },
    { code: 'resource "aws_db_instance" "app" {}' },
  ],
  invalid: [
    {
      code: 'resource "aws_db_instance" "app" {\n  name = "app"\n}',
      output: 'resource "aws_db_instance" "app" {\n  db_name = "app"\n}',
      errors: [{ messageId: 'dbInstanceName' }],
    },
    {
      code: 'resource "aws_db_instance" "app" {\n  name = var.db\n}',
      output: 'resource "aws_db_instance" "app" {\n  db_name = var.db\n}',
      errors: [{ messageId: 'dbInstanceName' }],
    },
    {
      code: 'resource "aws_db_instance" "app" {\n  name = "app"\n  db_name = "app"\n}',
      output: null,
      errors: [{ messageId: 'dbInstanceName' }],
    },
    {
      code: 'resource "aws_db_instance" "app" { name = "app" }',
      output: 'resource "aws_db_instance" "app" { db_name = "app" }',
      errors: [{ messageId: 'dbInstanceName' }],
    },
  ],
});
