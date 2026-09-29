# Configuration

## Config tiers

`lintofu` ships three ready-made configs. All are **generated from rule
metadata** rather than hand-maintained, so a rule cannot drift out of the tier
it declares
([ADR 0002](https://github.com/synapsestudios/lintofu/blob/main/docs/adr/0002-config-tiers-from-rule-metadata.md)).

| Config                                      | Contents                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| `lintofu.configs.recommended`               | Every rule whose metadata sets `recommended: true`, at its declared severity. |
| `lintofu.configs['aws/recommended']`        | The subset of those whose `category` is `aws`.                                |
| `lintofu.configs['cloudflare/recommended']` | The subset of those whose `category` is `cloudflare`.                         |

Each config is a complete flat-config object. It carries its own
`files: ['**/*.tf', '**/*.tofu']`, its own `language: 'lintofu/opentofu'`, and
`plugins: { lintofu }`, so dropping it into the array is all that is required:

```js
// eslint.config.js
import lintofu from '@synapsestudios/lintofu';

export default [lintofu.configs.recommended];
```

A rule's severity comes from its own `meta.docs.severity` and defaults to
`error` when the rule does not declare one. The [rule index](../rules/index.md) shows the
severity each rule carries.

### One provider only

If your configuration uses a single provider and you would rather not pull in
rules for providers you do not use, take the narrower tier instead. It covers
the same files:

```js
import lintofu from '@synapsestudios/lintofu';

export default [lintofu.configs['aws/recommended']];
```

`lintofu.configs['cloudflare/recommended']` works the same way. The Cloudflare
rules also read a plan setting, covered under [Cloudflare](#cloudflare) below.

## Wiring it up by hand

For full control over which rules run, skip the tiers and assemble the config
yourself. This is also the form to use when you want `lintofu` rules alongside
rules from another plugin on the same files.

```js
// eslint.config.js
import lintofu from '@synapsestudios/lintofu';

export default [
  {
    files: ['**/*.tf', '**/*.tofu'],
    plugins: { lintofu },
    language: 'lintofu/opentofu',
    rules: {
      'lintofu/documented-variables': 'error',
      'lintofu/required-providers-pinned': 'error',
    },
  },
];
```

Three pieces are mandatory in a hand-written block, and omitting any of them is
the usual cause of "no rules ran":

- `plugins: { lintofu }` registers the plugin under the `lintofu/` rule prefix.
- `language: 'lintofu/opentofu'` selects the HCL parser. Without it ESLint tries
  to parse `.tf` as JavaScript.
- `files` has to match `.tf` / `.tofu`. ESLint does not lint unknown extensions
  on its own.

## Tuning individual rules

No `lintofu` rule takes options today; every rule's `meta.schema` is empty. That
leaves severity as the tuning knob, plus the shared settings a provider ruleset
reads (see [Cloudflare](#cloudflare)).

Start from a tier and adjust on top of it. Later entries win, so a second
config object overrides what the tier set:

```js
import lintofu from '@synapsestudios/lintofu';

export default [
  lintofu.configs.recommended,
  {
    files: ['**/*.tf', '**/*.tofu'],
    rules: {
      // promote a warning to an error
      'lintofu/no-splat-bracket-index': 'error',
      // stop enforcing one rule everywhere
      'lintofu/typed-variables': 'off',
    },
  },
];
```

### Per-directory overrides

Legacy modules often cannot satisfy the same rules as new code. Narrow the
`files` pattern rather than turning the rule off globally:

```js
import lintofu from '@synapsestudios/lintofu';

export default [
  lintofu.configs.recommended,
  {
    files: ['legacy/**/*.tf'],
    rules: {
      'lintofu/module-source-pinned': 'warn',
    },
  },
];
```

### Inline suppression

ESLint's comment directives work as usual, using `#` comments:

```hcl
# eslint-disable-next-line lintofu/documented-variables
variable "internal_toggle" {
  type = bool
}
```

## Cloudflare

Some Cloudflare features are gated by the account's plan, and the Cloudflare
provider does not check entitlements at plan time. A configuration that uses a
paywalled feature plans clean and fails at apply. The `cloudflare` rules report
those cases during linting, once they know which plan the account is on. The
same tier also checks that DNS records and rulesets carry a Terraform ownership
marker, which needs no plan except for DNS record tags.

Declare the plan in ESLint shared settings under `lintofu.cloudflare.plan`:

```js
import lintofu from '@synapsestudios/lintofu';

export default [
  lintofu.configs['cloudflare/recommended'],
  {
    files: ['**/*.tf', '**/*.tofu'],
    settings: { lintofu: { cloudflare: { plan: 'pro' } } },
  },
];
```

Accepted values are `free`, `pro`, `business`, and `enterprise`.

The plan is a shared setting rather than a rule option because it describes the
account. Every plan-gated rule reads the same value, so you declare it once.

Two behaviors follow from the setting:

- **No plan set.** Checks that depend on the plan report nothing. With no
  `settings.lintofu.cloudflare.plan`, the country block check never fires and
  the DNS record tag check is skipped. The ownership checks that work on every
  plan still run.
- **Any other value.** Each plan-gated rule reports one error at the top of
  every linted file naming the unrecognized value, and skips its plan-dependent
  check for that file, since it cannot judge entitlement on a plan it does not
  know.

Rules that read the plan today:

- [`access-rule-country-block-requires-enterprise`](../rules/access-rule-country-block-requires-enterprise.md)
- [`dns-record-requires-managed-by-annotation`](../rules/dns-record-requires-managed-by-annotation.md),
  for its tag check only

## Ignoring files

Generated or vendored HCL is best excluded with a global ignores entry:

```js
export default [
  { ignores: ['**/.terraform/**', '**/vendor/**'] },
  lintofu.configs.recommended,
];
```

## Provider version constraints

Some rules only make sense from a given provider major onward. A rule about an
argument removed in AWS provider v6 is noise on a v5 configuration. Those rules
declare the constraint in their metadata as `meta.docs.appliesTo`, and the rule's
own page records it.

The constraint is documentation today, not a runtime filter: `lintofu` does not
read your lockfile. If a rule does not apply to the provider major you are on,
turn it off with a severity override. The policy behind this is
[ADR 0005](https://github.com/synapsestudios/lintofu/blob/main/docs/adr/0005-version-support-policy.md).

## Requesting a rule

Open a
[rule request](https://github.com/synapsestudios/lintofu/issues/new?template=rule-request.yml).
What the form asks for is described under
[Requesting a rule](https://github.com/synapsestudios/lintofu/blob/main/README.md#requesting-a-rule)
in the readme.
