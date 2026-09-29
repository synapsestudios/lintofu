# ruleset-requires-managed-by-description

Flag a `resource "cloudflare_ruleset"` whose top-level `description` is missing or doesn't match the configured marker. The default marker is `"Managed by terraform"`.

## Why

Cloudflare doesn't show which rulesets Terraform owns. Someone who edits a ruleset by hand has no warning that the next apply will revert it. The top-level `description` is the only ruleset field the [update API](https://developers.cloudflare.com/ruleset-engine/rulesets-api/update/) lets you change after creation, so it's the one place to record ownership.

The dashboard hides descriptions on zone-level rulesets. You see the marker through the API or `terraform state show`.

Every Cloudflare plan supports descriptions, so this rule ignores the plan setting.

## What it flags

A ruleset with no `description`, or with a literal `description` that doesn't match the marker exactly:

```hcl
resource "cloudflare_ruleset" "admin_ip_allowlist" {
  zone_id     = var.zone_id
  name        = "admin-surface-ip-allowlist"
  kind        = "zone"
  phase       = "http_request_firewall_custom"
  description = "Admin allowlist"            # flagged

  rules = [{
    action      = "block"
    description = "Allow only the office VPN IP to reach the admin surface"
    enabled     = true
    expression  = "..."
  }]
}
```

With `description = "Managed by terraform"`, the same resource passes. The `description` inside each entry of `rules` describes that entry, and this lint rule ignores it.

## What it does not flag

- A `description` set to a variable, local, or expression. The rule can't know its value at lint time.
- A ruleset with `kind = "managed"`. Cloudflare doesn't allow editing a managed ruleset's description.
- A `data "cloudflare_ruleset"` block.

## Autofix

None. The rule can't know where your team wants the argument placed.

## Options

| Option        | Type   | Default                  |
| ------------- | ------ | ------------------------ |
| `description` | string | `"Managed by terraform"` |

```js
export default [
  {
    rules: {
      'lintofu/ruleset-requires-managed-by-description': [
        'warn',
        { description: 'Owned by platform' },
      ],
    },
  },
];
```
