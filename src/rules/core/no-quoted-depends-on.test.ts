import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './no-quoted-depends-on.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

tester.run('no-quoted-depends-on', rule, {
  valid: [
    {
      code: 'resource "aws_instance" "web" { depends_on = [aws_instance.example] }',
    },
    {
      code: 'resource "aws_instance" "web" { depends_on = [aws_instance.example, module.vpc] }',
    },
    {
      code: 'resource "aws_instance" "web" { depends_on = ["${aws_instance.example}"] }',
    },
    {
      code: 'resource "aws_instance" "web" { depends_on = [] }',
    },
    {
      code: 'locals { depends_on = ["aws_instance.example"] }',
    },
  ],
  invalid: [
    {
      code: 'resource "aws_instance" "web" { depends_on = ["aws_instance.example"] }',
      output:
        'resource "aws_instance" "web" { depends_on = [aws_instance.example] }',
      errors: [{ messageId: 'quotedDependsOn' }],
    },
    {
      code: 'resource "aws_instance" "web" { depends_on = ["module.vpc"] }',
      output: 'resource "aws_instance" "web" { depends_on = [module.vpc] }',
      errors: [{ messageId: 'quotedDependsOn' }],
    },
    {
      code: 'resource "aws_instance" "web" { depends_on = [aws_instance.a, "aws_instance.b"] }',
      output:
        'resource "aws_instance" "web" { depends_on = [aws_instance.a, aws_instance.b] }',
      errors: [{ messageId: 'quotedDependsOn' }],
    },
    {
      code: 'resource "aws_instance" "web" { depends_on = ["aws_instance.example[0]"] }',
      output:
        'resource "aws_instance" "web" { depends_on = [aws_instance.example[0]] }',
      errors: [{ messageId: 'quotedDependsOn' }],
    },
    {
      code: 'resource "aws_instance" "web" { depends_on = ["not a reference"] }',
      errors: [{ messageId: 'quotedDependsOn' }],
    },
    {
      code: 'resource "aws_instance" "web" { depends_on = ["aws_instance.a", "aws_instance.b"] }',
      output:
        'resource "aws_instance" "web" { depends_on = [aws_instance.a, aws_instance.b] }',
      errors: [
        { messageId: 'quotedDependsOn' },
        { messageId: 'quotedDependsOn' },
      ],
    },
    {
      code: 'resource "aws_instance" "web" { depends_on = ["aws_instance.example[\\"a\\"]"] }',
      output:
        'resource "aws_instance" "web" { depends_on = [aws_instance.example["a"]] }',
      errors: [{ messageId: 'quotedDependsOn' }],
    },
  ],
});
