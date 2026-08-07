# Getting started

`lintofu` is an ESLint **language plugin**, the same mechanism behind
[`@eslint/json`](https://github.com/eslint/json) and
[`@eslint/css`](https://github.com/eslint/css). It teaches ESLint to parse `.tf`
and `.tofu` files, then runs rules against the resulting AST. Everything you
already get from ESLint — editor integration, `--fix`, severity levels, CI
formatters — applies to your OpenTofu configuration unchanged.

## Requirements

- Node `^20.19`, `^22.13`, or `>=24`
- ESLint `^9` or `^10`

## Install

```sh
npm install --save-dev @synapsestudios/lintofu
```

The package currently lives in GitHub Packages rather than the public npm
registry, so consumers need an `.npmrc` that maps the `@synapsestudios` scope to
that registry and supplies a token with `read:packages`:

```ini
@synapsestudios:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## The shortest working config

```js
// eslint.config.js
import lintofu from '@synapsestudios/lintofu';

export default [lintofu.configs.recommended];
```

That single entry brings its own `files` pattern (`**/*.tf`, `**/*.tofu`), its
own `language` selection, and every rule marked recommended, each at the
severity the rule declares.

Then run ESLint the way you always do:

```sh
npx eslint .
```

ESLint does not lint unknown extensions by default, so if you invoke it against
a directory rather than a glob, the `files` pattern in the config is what pulls
`.tf` and `.tofu` files in.

## Autofix

Many rules ship a fixer. The [rule index](/rules/) marks them in the **Fixable**
column. To apply them:

```sh
npx eslint . --fix
```

## What lintofu does and does not check

`lintofu` covers **syntactic and stylistic** conventions: documentation
requirements, version pinning, deprecated and removed syntax, and structural
patterns that cause drift.

It deliberately stops short of:

- **Semantic validation.** That is `tofu validate`'s job.
- **Type checking and symbol resolution.** Those need the full language runtime
  and belong to the built-in linter described in the
  [OpenTofu linting RFC](https://github.com/opentofu/opentofu/pull/3999).
- **TFLint compatibility.** `lintofu` shares no code with TFLint and does not
  load TFLint custom rules.

## Version support

The parser wraps HashiCorp's `hcl/v2`, which parses HCL2 — the syntax that
shipped with Terraform 0.12. That is a hard floor: Terraform 0.11 and older
(HCL1) do not parse at all. OpenTofu forked from Terraform 1.5, so every
OpenTofu release clears it.

The full per-generation support matrix, the provider support policy, and the
provider versions the rules are tested against are maintained in the readme:

- [Supported versions](https://github.com/synapsestudios/lintofu/blob/main/README.md#supported-versions)
- [Tested provider versions](https://github.com/synapsestudios/lintofu/blob/main/README.md#tested-provider-versions)
- [ADR 0005: version support policy](https://github.com/synapsestudios/lintofu/blob/main/docs/adr/0005-version-support-policy.md)

## Next

- [Configuration](/user-guide/configuration) — config tiers, manual wiring, and
  per-rule tuning.
- [Rules](/rules/) — the full list.
