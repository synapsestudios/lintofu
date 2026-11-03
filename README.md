# lintofu

An ESLint plugin for linting [OpenTofu](https://opentofu.org) configurations.

> [!WARNING]
> The parser depends on Go's [`syscall/js`](https://pkg.go.dev/syscall/js), which the Go team has declared experimental and exempt from the Go compatibility promise. A future Go release _may_ break the functionality of this plugin. `lintofu` will stay on `0.x` until `syscall/js` stabilizes or we replace it. See [ADR 0001](./docs/adr/0001-syscall-js-experimental.md).

This is a pre-release and experimental ESLint plugin. 

Published to npm as [`@synapsestudios/lintofu`](https://www.npmjs.com/package/@synapsestudios/lintofu).

## Head striaght to the docs?

The lintofu docs are located here: [synapsestudios.github.io/lintofu](https://synapsestudios.github.io/lintofu/) the frontend that represents the documentation located in [`docs/`](./docs).

## What it is

`lintofu` is an **ESLint language plugin** (the same mechanism that powers [`@eslint/json`](https://github.com/eslint/json) and [`@eslint/css`](https://github.com/eslint/css)). 

It parses `.tf` and `.tofu` files using HashiCorp's own `hcl/v2` parser (compiled to WebAssembly) and exposes the AST to ESLint rules so you can enforce OpenTofu or Terraform coding conventions alongside the rest of your ESLint rules.

### What it (is not)

We (Synapse Studios) have been using this internally for a few months. This statement is to provide clarity on the kind of expectations you should have when engaging with it, we will accept contributions from the community, however, we can make no promises as to what kind of attention we will be able to give it when it comes to approving/reviewing/or otherwise engaging with community feedback. 

This will be (for the foreseeable future) _best effort_ and sometimes we will be too busy to triage incoming pull requests or bug reports.

### AI Disclosure

To be clear, AI _has_ been used to help build this tool, but the specifications, features, rules, the way in which the plugin handles rule precedence, processing, and the like have _all_ been defined by humans clearly, with insight and scrutiny from a team of experienced DevOps engineers and Software Engineers in order to build something that isn't complete slop. We're tired of slop.

## Scope

`lintofu` asserts against syntactic problems, stylistic conventions, and some provider specific code smells. We provide a list of somewhat generic (but other times opinionated) set of core rules, listed in our [rules index](https://synapsestudios.github.io/lintofu/rules/), that you can take advantage of.

### Our intentions for `lintofu`:

We built lintofu as a stop-gap until feature rich fully fledged linting is available. You can read more about that from the [OpenTofu linting RFC](https://github.com/opentofu/opentofu/pull/3999). This isn't meant to be a complete replacement for what will soon be the linter implementation in OpenTofu, however, it _is_ meant to provide all of the necessary facilities and interfaces to build a comprehensive suite of assertions and rules at the same level.

## Install

### Pre-requisites

Required versions:
- Node >= `22.13` 
- ESLint >= `9.x`

### Setup

```sh
npm install --save-dev @synapsestudios/lintofu
```

If you installed it from GitHub Packages before, delete these lines from your `.npmrc`. While they're there, npm resolves every `@synapsestudios` package from GitHub Packages, which no longer gets new releases:

```
@synapsestudios:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## Supported versions

We would like to have as broad of compatibility as possible, so our aim is to have full compatibility with the major cloud providers in which our rules are tested against, from the _last_ major version to the latest major version. 

As this plugin ages, we expect to have to provide _some_ backwards compatibility with our rules that may target older providers' code smells, but our focus will be on moving the tool forwards with the rest of the ecosystem. Our full decision making record and rationale on this is defined in [ADR 0005](./docs/adr/0005-version-support-policy.md).

The parser wraps HashiCorp's `hcl/v2`, which parses HCL2, the syntax that shipped with Terraform 0.12. We _will not be supporting `hcl/v1` or Terraform versions that pre-date `0.12`.

<!-- lintofu:support-matrix:start -->

| Tool      | Versions       | Status      |
| --------- | -------------- | ----------- |
| OpenTofu  | 1.6 and newer  | supported   |
| Terraform | 1.0 and newer  | supported   |
| Terraform | 0.12 – 0.15    | best effort |
| Terraform | 0.11 and older | unsupported |

<!-- lintofu:support-matrix:end -->

- **supported**: We focus on building rules that apply to these versions.
- **best effort**: Some rules may target these specific versions and the gotchas associated with upgrading _from_ them, but we won't be writing rules that target specific syntax that is only applicable to these versions.
- **unsupported**: The parser will reject these.

<!-- lintofu:tested-versions:start -->

## Tested provider versions

Provider-specific rules are validated against these versions. This is a list located here: [`provider-versions.json`](./provider-versions.json) which defines which provider versions we test against in CI.

- aws provider `v6.42.0`
- cloudflare provider `v5.24.0`

<!-- lintofu:tested-versions:end -->

## Usage

```js
// eslint.config.js
import lintofu from "@synapsestudios/lintofu";

export default [lintofu.configs.recommended];
```

Or opt into specific rules and error statuses.

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

Every rule's description, severity, category, recommended flag, and autofix support lives in the generated **[Rule index](https://synapsestudios.github.io/lintofu/rules/)** on the documentation site

## Requesting a rule

To suggest a new rule, open a [rule request](https://github.com/synapsestudios/lintofu/issues/new?template=rule-request.yml). The form asks for a snippet the rule should flag, the compliant form, a category, a suggested severity, whether an autofix seems possible, and any references. One of our maintainers will pick up your issue and approve it or reject it with a reason.

## Parser services

Rules can reach a lazily-built, cross-file index through
`context.sourceCode.parserServices.projectIndex`. The `ProjectIndex` interface
and its module-directory scope are documented in the developer guide:
[on the site](https://synapsestudios.github.io/lintofu/developer-guide/parser-services)
or [`docs/developer-guide/parser-services.md`](./docs/developer-guide/parser-services.md)
in this repository.

## Writing your own rule

`lintofu` re-exports the rule-authoring types it uses internally, so a custom rule type-checks without reaching into private modules. We have an example of this [on the site](https://synapsestudios.github.io/lintofu/developer-guide/writing-a-rule) or [`docs/developer-guide/writing-a-rule.md`](./docs/developer-guide/writing-a-rule.md) in this repository.

## Architecture

The parser is Go: `github.com/hashicorp/hcl/v2/hclsyntax` compiled to
WebAssembly. We have a simple ASCII representation of the architecture here [on the site](https://synapsestudios.github.io/lintofu/developer-guide/architecture) or [`docs/developer-guide/architecture.md`](./docs/developer-guide/architecture.md) in this repository.

## Known limitations

- **`.tf.json` / `.tofu.json` not supported.** The JSON form of HCL is not 1:1 with native syntax; see [hashicorp/hcl#627 for the rationale](https://github.com/hashicorp/hcl/issues/627).
- **No TFLint custom-rule compatibility.** We are _considering_ adding `tflint` support so that users can import rules, but we haven't made a decision on whether or not it should happen.