# Getting started

`lintofu` is an ESLint **language plugin**, the same mechanism behind
[`@eslint/json`](https://github.com/eslint/json) and
[`@eslint/css`](https://github.com/eslint/css). It teaches ESLint to parse `.tf`
and `.tofu` files, then runs rules against the resulting AST. Everything you
already get from ESLint (editor integration, `--fix`, severity levels, CI
formatters) applies to your OpenTofu configuration unchanged.

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

Many rules ship a fixer. The [rule index](../rules/index.md) marks them in the **Fixable**
column. To apply them:

```sh
npx eslint . --fix
```

## Scope and version support

Both are maintained in the readme rather than restated here, so there is one
copy to keep correct:

- [Scope](https://github.com/synapsestudios/lintofu/blob/main/README.md#scope),
  covering what `lintofu` checks and what it leaves to `tofu validate` and to
  OpenTofu's future built-in linter
- [Supported versions](https://github.com/synapsestudios/lintofu/blob/main/README.md#supported-versions),
  including the HCL2 parser floor and the per-generation support matrix
- [Tested provider versions](https://github.com/synapsestudios/lintofu/blob/main/README.md#tested-provider-versions)
- [ADR 0005: version support policy](https://github.com/synapsestudios/lintofu/blob/main/docs/adr/0005-version-support-policy.md)

## Next

- [Configuration](./configuration.md): config tiers, manual wiring, and
  per-rule tuning.
- [Rules](../rules/index.md): the full list.
