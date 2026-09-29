# dns-record-requires-managed-by-annotation

Flag a `resource "cloudflare_dns_record"` that is missing the Terraform ownership markers. The record needs a `comment` equal to the configured comment on every plan. On Pro and higher, it also needs the configured tag in `tags`.

## Why

The Cloudflare dashboard shows no sign of which DNS records Terraform owns, so a change made by hand gets overwritten on the next apply. The comment marks the record on every zone. The tag lets the dashboard filter records by owner. See [record attributes](https://developers.cloudflare.com/dns/manage-dns-records/reference/record-attributes/#availability) in the Cloudflare docs. Comments are available on every plan, and tags need Pro or higher.

## Plan setting

The tag check reads the account plan from ESLint shared settings, the same `settings.lintofu.cloudflare.plan` value the other Cloudflare rules use:

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

A plan value outside the accepted four reports one error at the top of each linted file naming the value. The tag check is skipped for that file, and the comment check still runs. The [configuration guide](../user-guide/configuration.md#cloudflare) covers the setting in full.

## What it flags

On `plan: 'pro'`, a record with no comment and no tag reports twice:

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

The comment must match exactly. The tag follows Cloudflare's rules for [tags](https://developers.cloudflare.com/dns/manage-dns-records/reference/record-attributes/#tags). The name matches without case and the value matches with case, so `Managed-By:terraform` passes and `managed-by:Terraform` does not.

## What it does not flag

- A `comment` set to a variable, local, or expression, whose value cannot be resolved at lint time.
- A `tags` value that is not a list literal, such as `var.tags` or `concat(...)`.
- A `tags` list with no matching literal entry that holds at least one entry the rule cannot resolve, since that entry may be the tag.
- A `data "cloudflare_dns_record"` block, or the v4 `cloudflare_record` resource.

## Autofix

None. The rule does not know where the team wants the arguments placed.

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
