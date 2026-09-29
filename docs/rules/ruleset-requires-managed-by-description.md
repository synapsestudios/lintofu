# ruleset-requires-managed-by-description

Flag a `resource "cloudflare_ruleset"` whose top-level `description` is missing or differs from the configured marker, `"Managed by terraform"` by default.

## Why

Cloudflare shows no sign of which rulesets Terraform owns, so a change made by hand gets overwritten on the next apply. The top-level `description` is the only ruleset field Cloudflare lets you change after creation, which makes it the one place to record ownership. See the [ruleset update API](https://developers.cloudflare.com/ruleset-engine/rulesets-api/update/).

The dashboard does not display descriptions on zone-level rulesets. The marker is visible through the API and `terraform state show`.

## What it flags

A ruleset with no `description`, or a literal `description` that does not match the marker exactly:

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

With `description = "Managed by terraform"` the same resource passes. Each nested rule keeps its own `description` for what that rule does, and the rule does not read it.

## What it does not flag

- A `description` set to a variable, local, or expression, whose value cannot be resolved at lint time.
- A ruleset with `kind = "managed"`. Cloudflare blocks editing the description of a managed ruleset.
- A `data "cloudflare_ruleset"` block.

## Autofix

None. The rule does not know where the team wants the argument placed.

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

The rule reads no plan setting, since descriptions exist on every Cloudflare plan.
