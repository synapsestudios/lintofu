# dns-record-requires-managed-by-annotation

Flag a `resource "cloudflare_dns_record"` that lacks a Terraform ownership marker. Every record needs the configured `comment`. On Pro and higher, `tags` also needs the configured tag.

## Why

The Cloudflare dashboard doesn't show which DNS records Terraform owns. Someone who edits a record by hand has no warning that the next apply will revert it. The comment marks the record on any zone, and the tag lets the dashboard filter records by owner. Comments work on every plan and tags need Pro or higher, per Cloudflare's [record attributes](https://developers.cloudflare.com/dns/manage-dns-records/reference/record-attributes/#availability) page.

## Plan setting

The tag check reads `settings.lintofu.cloudflare.plan`, the same setting the other Cloudflare rules use:

```js
export default [
  {
    files: ['**/*.tf', '**/*.tofu'],
    settings: { lintofu: { cloudflare: { plan: 'pro' } } },
  },
];
```

| Plan                            | Comment checked | Tag checked |
| ------------------------------- | --------------- | ----------- |
| unset                           | yes             | no          |
| `free`                          | yes             | no          |
| `pro`, `business`, `enterprise` | yes             | yes         |

An unrecognized plan value gets one error at the top of each file. The rule then skips the tag check for that file and still checks the comment. The [configuration guide](../user-guide/configuration.md#cloudflare) covers the setting in full.

## What it flags

On `plan: 'pro'`, this record gets two reports:

```hcl
resource "cloudflare_dns_record" "app" {    # flagged: no comment, no tag
  zone_id = var.zone_id
  name    = "app"
  type    = "CNAME"
  content = var.website_endpoint
  proxied = true
  ttl     = 1
}
```

This record passes on Pro:

```hcl
resource "cloudflare_dns_record" "app" {
  zone_id = var.zone_id
  name    = "app"
  type    = "CNAME"
  content = var.website_endpoint
  proxied = true
  ttl     = 1
  comment = "Managed by terraform"
  tags    = ["managed-by:terraform"]
}
```

On Free, the same record passes without `tags`.

The comment must match exactly. The tag follows Cloudflare's [tag rules](https://developers.cloudflare.com/dns/manage-dns-records/reference/record-attributes/#tags), where names ignore case and values don't. `Managed-By:terraform` passes and `managed-by:Terraform` fails.

## What it does not flag

- A `comment` set to a variable, local, or expression. The rule can't know its value at lint time.
- A `tags` value that isn't a list literal, such as `var.tags` or `concat(...)`.
- A `tags` list that contains a variable or expression, when no literal entry matches. That entry could be the tag.
- A `data "cloudflare_dns_record"` block or the v4 `cloudflare_record` resource.

## Autofix

None. The rule can't know where your team wants the arguments placed.

## Options

| Option    | Type   | Default                  |
| --------- | ------ | ------------------------ |
| `comment` | string | `"Managed by terraform"` |
| `tag`     | string | `"managed-by:terraform"` |

```js
export default [
  {
    rules: {
      'lintofu/dns-record-requires-managed-by-annotation': [
        'warn',
        { comment: 'Owned by platform', tag: 'owner:platform' },
      ],
    },
  },
];
```
