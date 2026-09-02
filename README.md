# lintofu

An ESLint plugin for linting [OpenTofu](https://opentofu.org) configurations.

> [!WARNING]
> The parser depends on Go's [`syscall/js`](https://pkg.go.dev/syscall/js), which the Go team has declared experimental and exempt from the Go compatibility promise. A future Go release can break us. `lintofu` will stay on `0.x` until `syscall/js` stabilizes or we replace it. See [ADR 0001](./docs/adr/0001-syscall-js-experimental.md).

Pre-1.0. API and rule set may change. Published to GitHub Packages under the `@synapsestudios` scope while it's being tested internally; a move to the public npm registry will follow.

**Documentation:** [synapsestudios.github.io/lintofu](https://synapsestudios.github.io/lintofu/) covers the user guide, the developer guide, and the full rule index. The same pages are in [`docs/`](./docs), which is what resolves when reading this file from the npm tarball.

## What it is

`lintofu` is an **ESLint language plugin** (the same mechanism that powers [`@eslint/json`](https://github.com/eslint/json) and [`@eslint/css`](https://github.com/eslint/css)). It parses `.tf` and `.tofu` files using HashiCorp's own `hcl/v2` parser (compiled to WebAssembly) and exposes the AST to ESLint rules so you can enforce OpenTofu coding conventions alongside the rest of your ESLint rules.

## Scope

`lintofu` checks syntactic and stylistic conventions: documentation, pinning, and the structural patterns listed in the [rule index](./docs/rules/index.md). Its boundaries:

- Semantic validation belongs to `tofu validate`. `lintofu` leaves that to OpenTofu.
- Semantic and evaluated rules (type-checking, symbol resolution) belong to the future built-in linter described in the [OpenTofu linting RFC](https://github.com/opentofu/opentofu/pull/3999), which needs the full language runtime. `lintofu` stays on the syntactic and stylistic side, where ESLint's ecosystem already fits.
- `lintofu` is a fresh ESLint-native tool. It shares no code with TFLint, which lacks OpenTofu-specific feature support.

## Install

```sh
npm install --save-dev @synapsestudios/lintofu
```

The package lives in GitHub Packages, so consumers need an `.npmrc` that maps the `@synapsestudios` scope to the registry and supplies a token with `read:packages`:

```
@synapsestudios:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Requires Node ^20.19, ^22.13, or >=24 and ESLint ^9 || ^10.

## Supported versions

Providers: latest major plus one prior (AWS provider v6 and v5 today); older majors are best effort. Rules that only apply from a given provider major declare it in `meta.docs.appliesTo`. Full policy in [ADR 0005](./docs/adr/0005-version-support-policy.md).

The parser wraps HashiCorp's `hcl/v2`, which parses HCL2, the syntax that shipped with Terraform 0.12. That sets a hard floor: Terraform 0.12 and newer parse, Terraform 0.11 and older (HCL1) do not. OpenTofu forked from Terraform 1.5, so every OpenTofu release is above the floor.

Above the floor, the same ADR defines the per-generation status:

<!-- lintofu:support-matrix:start -->

| Tool      | Versions       | Status      |
| --------- | -------------- | ----------- |
| OpenTofu  | 1.6 and newer  | supported   |
| Terraform | 1.0 and newer  | supported   |
| Terraform | 0.12 – 0.15    | best effort |
| Terraform | 0.11 and older | unsupported |

<!-- lintofu:support-matrix:end -->

- **supported**: generations the rules are written for; advice is kept valid for them as part of normal maintenance.
- **best effort**: configurations parse and lint. Many rules exist specifically to flag upgrade hazards in these generations (legacy `list(...)`/`map(...)`, quoted type constraints, and friends), but we fix issues as they're reported rather than checking proactively.
- **unsupported**: HCL1 syntax. The parser rejects these files.

These statuses are policy commitments, not CI results: no workflow runs real OpenTofu or Terraform binaries yet. This table is maintained by hand and will be replaced by generated output once the version test harness exists.

<!-- lintofu:tested-versions:start -->

## Tested provider versions

Provider-specific rules are validated against these versions. [`provider-versions.json`](./provider-versions.json) is the source of truth; edit it and run `npm run docs:versions` to update this section. CI fails if the two drift.

- aws provider v6.42.0
- cloudflare provider v5.24.0

<!-- lintofu:tested-versions:end -->

## Usage

```js
// eslint.config.js
import lintofu from "@synapsestudios/lintofu";

export default [lintofu.configs.recommended];
```

Or wire up manually for full control:

```js
// eslint.config.js
import lintofu from "@synapsestudios/lintofu";

export default [
  {
    files: ["**/*.tf", "**/*.tofu"],
    plugins: { lintofu },
    language: "lintofu/opentofu",
    rules: {
      "lintofu/documented-variables": "error",
      "lintofu/required-providers-pinned": "error",
    },
  },
];
```

## Rules

Every rule's description, severity, category, recommended flag, and autofix
support lives in the generated rule index:

- **[Rule index](https://synapsestudios.github.io/lintofu/rules/)** on the
  documentation site
- [`docs/rules/index.md`](./docs/rules/index.md) in this repository, the same
  content, which resolves here today while the site is still private

The index is generated from each rule's `meta.docs` by `npm run docs:rules`, and
CI fails on a rule with no docs page or a stale index, so it cannot drift from
the rules that actually ship.

## Requesting a rule

To suggest a new rule, open a [rule request](https://github.com/synapsestudios/lintofu/issues/new?template=rule-request.yml). The form asks for a snippet the rule should flag, the compliant form, a category, a suggested severity, whether an autofix seems possible, and any references. A maintainer turns the request into a rule issue from there.

## Parser services

Rules can reach a lazily-built, cross-file index through
`context.sourceCode.parserServices.projectIndex`. The `ProjectIndex` interface
and its module-directory scope are documented in the developer guide:
[on the site](https://synapsestudios.github.io/lintofu/developer-guide/parser-services)
or [`docs/developer-guide/parser-services.md`](./docs/developer-guide/parser-services.md)
in this repository.

## Writing your own rule

`lintofu` re-exports the rule-authoring types it uses internally, so a custom
rule type-checks without reaching into private modules. The worked example is in
the developer guide:
[on the site](https://synapsestudios.github.io/lintofu/developer-guide/writing-a-rule)
or [`docs/developer-guide/writing-a-rule.md`](./docs/developer-guide/writing-a-rule.md)
in this repository.

## Architecture

The parser is Go: `github.com/hashicorp/hcl/v2/hclsyntax` compiled to
WebAssembly. The full picture is in the developer guide:
[on the site](https://synapsestudios.github.io/lintofu/developer-guide/architecture)
or [`docs/developer-guide/architecture.md`](./docs/developer-guide/architecture.md)
in this repository.

## Known limitations

- **Experimental dependency on `syscall/js`.** See [ADR 0001](./docs/adr/0001-syscall-js-experimental.md). The project inherits its experimental status from Go's WASM JS interop package. Pinning a Go version in CI is the mitigation.
- **`.tf.json` / `.tofu.json` not supported.** The JSON form of HCL is not 1:1 with native syntax; see [hashicorp/hcl#627 for the rationale](https://github.com/hashicorp/hcl/issues/627).
- **No TFLint custom-rule compatibility.** An opinionated migration example may land later; a general compatibility layer is not planned for early releases.
- **Performance is unprofiled.** Go+WASM boot costs ~100ms per ESLint process; per-file parse is sub-millisecond after boot.
