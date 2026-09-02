# access-rule-country-block-requires-enterprise

Flag a `resource "cloudflare_access_rule"` that blocks by country when the Cloudflare plan declared in `settings.lintofu.cloudflare.plan` is `free`, `pro`, or `business`. Cloudflare allows country blocks in IP Access rules on the Enterprise plan only.

## Why

The Cloudflare provider does not check plan entitlements at plan time. A configuration that blocks by country on a lower plan plans clean and fails at apply, every time. Declaring the plan once in the ESLint config lets this rule report the failure during review instead. See [Important remarks about allowing/blocking by country](https://developers.cloudflare.com/waf/tools/ip-access-rules/#important-remarks-about-allowingblocking-by-country) in the Cloudflare docs.

## Plan setting

The rule reads the account plan from ESLint shared settings. Accepted values are `free`, `pro`, `business`, and `enterprise`.

```js
export default [
  {
    files: ['**/*.tf', '**/*.tofu'],
    settings: { lintofu: { cloudflare: { plan: 'pro' } } },
  },
];
```

When no plan is set the rule reports nothing, because it cannot know whether the account is entitled. A value outside the accepted four reports one error at the top of each linted file naming the value, and the country-block check is skipped for that file. The [configuration guide](../user-guide/configuration.md#cloudflare) covers the setting in full.

## What it flags

A `cloudflare_access_rule` with `mode = "block"` and `configuration.target = "country"` while the configured plan is below Enterprise:

```hcl
resource "cloudflare_access_rule" "block_ru" {
  zone_id = var.zone_id
  mode    = "block"
  configuration = {
    target = "country"        # flagged on free, pro, and business
    value  = "RU"
  }
}
```

With `plan: 'enterprise'` the same resource passes.

## What it does not flag

- `challenge`, `js_challenge`, `managed_challenge`, and `whitelist` with a country target. Cloudflare paywalls only the block action.
- Any mode with a target of `ip`, `ip6`, `ip_range`, or `asn`.
- A `mode` or `target` given as a variable or expression, whose value cannot be resolved at lint time.
- Any file when `settings.lintofu.cloudflare.plan` is absent.

The rule reads the provider v5 form, where `configuration` is an attribute (`configuration = { ... }`). The v4 block form is not inspected.

## Autofix

None. The fix is a plan upgrade or a different action, and the rule cannot choose between them.

## Options

None. The plan comes from shared settings, since it describes the account and would otherwise repeat per rule.
