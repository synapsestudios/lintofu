import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../index.js';
import { initialize } from '../../parser/index.js';
import rule from './dns-record-requires-managed-by-annotation.js';

RuleTester.describe = describe;
RuleTester.it = it;

await initialize();

const tester = new RuleTester({
  plugins: { lintofu: plugin },
  language: 'lintofu/opentofu',
});

function dnsRecord(...lines: string[]) {
  return [
    'resource "cloudflare_dns_record" "app" {',
    '  zone_id = var.zone_id',
    ...lines.map((line) => `  ${line}`),
    '}',
  ].join('\n');
}

const MARKED_COMMENT = 'comment = "Managed by terraform"';
const MARKED_TAGS = 'tags    = ["managed-by:terraform"]';

function onPlan(plan: unknown) {
  return { lintofu: { cloudflare: { plan } } };
}

function missingCommentOn(plan: string) {
  return {
    code: dnsRecord(MARKED_TAGS),
    settings: onPlan(plan),
    errors: [{ messageId: 'missingComment', line: 1 }],
  };
}

function missingTagOn(plan: string, ...lines: string[]) {
  return {
    code: dnsRecord(MARKED_COMMENT, ...lines),
    settings: onPlan(plan),
    errors: [
      {
        messageId: 'missingTag',
        data: { tag: 'managed-by:terraform', plan },
        line: lines.length > 0 ? 4 : 1,
      },
    ],
  };
}

function markedOnPro(...lines: string[]) {
  return { code: dnsRecord(MARKED_COMMENT, ...lines), settings: onPlan('pro') };
}

tester.run('dns-record-requires-managed-by-annotation', rule, {
  valid: [
    dnsRecord(MARKED_COMMENT),
    { code: dnsRecord(MARKED_COMMENT), settings: onPlan('free') },
    dnsRecord('comment = var.comment'),
    dnsRecord('comment = "Managed by ${var.tool}"'),
    'data "cloudflare_dns_record" "app" {\n  zone_id = var.zone_id\n}',
    'resource "cloudflare_record" "app" {\n  zone_id = var.zone_id\n}',
    markedOnPro(MARKED_TAGS),
    {
      code: dnsRecord(MARKED_COMMENT, MARKED_TAGS),
      settings: onPlan('enterprise'),
    },
    markedOnPro('tags = ["team:web", "managed-by:terraform"]'),
    markedOnPro('tags = ["Managed-By:terraform"]'),
    markedOnPro('tags = var.tags'),
    markedOnPro('tags = concat(var.tags, ["team:web"])'),
    markedOnPro('tags = ["team:web", var.owner_tag]'),
    markedOnPro('tags = ["${var.owner}"]'),
    {
      code: dnsRecord(MARKED_COMMENT),
      settings: { lintofu: { cloudflare: {} } },
    },
    {
      code: dnsRecord(
        'comment = "Owned by platform"',
        'tags = ["owner:platform"]',
      ),
      settings: onPlan('pro'),
      options: [{ comment: 'Owned by platform', tag: 'owner:platform' }],
    },
  ],
  invalid: [
    {
      code: dnsRecord(),
      errors: [
        {
          messageId: 'missingComment',
          data: { comment: 'Managed by terraform' },
          line: 1,
        },
      ],
    },
    {
      code: dnsRecord('comment = "Managed by Terraform"'),
      errors: [{ messageId: 'missingComment', line: 3, column: 3 }],
    },
    missingCommentOn('free'),
    missingCommentOn('pro'),
    missingCommentOn('business'),
    missingCommentOn('enterprise'),
    missingTagOn('pro'),
    missingTagOn('business'),
    missingTagOn('enterprise'),
    missingTagOn('pro', 'tags = []'),
    missingTagOn('pro', 'tags = ["team:web"]'),
    missingTagOn('pro', 'tags = ["managed-by:terraform-old"]'),
    missingTagOn('pro', 'tags = ["managed-by:Terraform"]'),
    missingTagOn('pro', 'tags = ["managed-by"]'),
    {
      code: 'locals {}\n\nlocals {}',
      settings: onPlan('buisness'),
      errors: [
        {
          messageId: 'invalidPlan',
          data: { value: 'buisness' },
          line: 1,
          column: 1,
        },
      ],
    },
    {
      code: dnsRecord(),
      settings: onPlan(3),
      errors: [
        { messageId: 'invalidPlan', data: { value: '3' }, line: 1 },
        { messageId: 'missingComment', line: 1 },
      ],
    },
    {
      code: dnsRecord(),
      settings: onPlan('business'),
      errors: [
        { messageId: 'missingComment', line: 1 },
        { messageId: 'missingTag', line: 1 },
      ],
    },
    {
      code: dnsRecord(MARKED_COMMENT, MARKED_TAGS),
      settings: onPlan('pro'),
      options: [{ comment: 'Owned by platform', tag: 'owner:platform' }],
      errors: [
        {
          messageId: 'missingComment',
          data: { comment: 'Owned by platform' },
          line: 3,
        },
        {
          messageId: 'missingTag',
          data: { tag: 'owner:platform', plan: 'pro' },
          line: 4,
        },
      ],
    },
  ],
});
