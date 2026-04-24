# lintofu

An ESLint plugin for linting [OpenTofu](https://opentofu.org) configurations.

> **⚠️ Experimental.** The parser depends on Go's [`syscall/js`](https://pkg.go.dev/syscall/js), which the Go team has declared experimental and exempt from the Go compatibility promise. A future Go release can break us. `lintofu` will stay on `0.x` until `syscall/js` stabilises or we replace it. See [ADR 0001](./docs/adr/0001-syscall-js-experimental.md).

Pre-1.0. API and rule set may change. Not yet published.

## What it is

`lintofu` is an **ESLint language plugin** (the same mechanism that powers [`@eslint/json`](https://github.com/eslint/json) and [`@eslint/css`](https://github.com/eslint/css)). It parses `.tf` and `.tofu` files using HashiCorp's own `hcl/v2` parser (compiled to WebAssembly) and exposes the AST to ESLint rules so you can enforce OpenTofu coding conventions alongside the rest of your ESLint rules.

## What it is not

- **Not a replacement for `tofu validate`.** Validation is OpenTofu's job.
- **Not competition for a future built-in OpenTofu linter.** The [OpenTofu linting RFC](https://github.com/opentofu/opentofu/pull/3999) covers semantic/evaluated rules (type-checking, symbol resolution) that need the full language runtime. `lintofu` stays on the syntactic/stylistic side (conventions, documentation, pinning) where ESLint's ecosystem is already a good fit.
- **Not a TFLint fork.** TFLint doesn't support OpenTofu-specific features. This is a fresh ESLint-native tool.

## Install

```sh
npm install --save-dev lintofu
```

Requires Node ^20.19, ^22.13, or >=24 and ESLint ^9 || ^10.

## Usage

```js
// eslint.config.js
import lintofu from "lintofu";

export default [lintofu.configs.recommended];
```

Or wire up manually for full control:

```js
// eslint.config.js
import lintofu from "lintofu";

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

| Rule                                                                     | Description                                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| [`documented-variables`](./docs/rules/documented-variables.md)           | Every `variable` block must have a non-empty `description`.                          |
| [`documented-outputs`](./docs/rules/documented-outputs.md)               | Every `output` block must have a non-empty `description`.                            |
| [`required-providers-pinned`](./docs/rules/required-providers-pinned.md) | Every provider in `terraform.required_providers` must declare a `version`.           |
| [`module-source-pinned`](./docs/rules/module-source-pinned.md)           | `module` sources must be pinned via `?ref=`, a `version` attribute, or a local path. |
| [`prefer-bare-expression`](./docs/rules/prefer-bare-expression.md)       | Flag the redundant `"${expr}"` wrapping pattern.                                     |

## Architecture

The parser is Go; we wrap `github.com/hashicorp/hcl/v2/hclsyntax` and compile it to WebAssembly. JS can't faithfully parse HCL v2 today; the existing npm packages are unmaintained or drop source positions.

At a high level:

```mermaid
flowchart TD
    A[.tf / .tofu file] --> B[OpenTofuLanguage.parse]
    B --> C[parseSync JS]
    C --> D[__lintofu_parse WASM]
    D --> E[JSON AST]
    E --> F[ESLint Rules]
```

## Known limitations

- **Experimental dependency on `syscall/js`.** See [ADR 0001](./docs/adr/0001-syscall-js-experimental.md). The project inherits its experimental status from Go's WASM JS interop package. Pinning a Go version in CI is the mitigation.
- **AST coverage is partial.** Function calls, conditionals, for-expressions, splats, and a few other expression types currently fall back to `UnknownExpr`, so rules that need to inspect their internals can't. They will be added as rules need them.
- **`.tf.json` / `.tofu.json` not supported.** The JSON form of HCL is not 1:1 with native syntax; see [hashicorp/hcl#627 for the rationale](https://github.com/hashicorp/hcl/issues/627).
- **No TFLint custom-rule compatibility.** An opinionated migration example may land later; a general compatibility layer is not planned for early releases.
- **Performance is unprofiled.** Go+WASM boot costs ~100ms per ESLint process; per-file parse is sub-millisecond after boot.

### AST coverage

Anything marked Not Yet Implemented falls back to `UnknownExpr`, so rules can see the node and its source range but can't inspect its internals.

| Expression Type[^ast-coverage]                               | Supported | Not Yet Implemented |
| ------------------------------------------------------------ | --------- | ------------------- |
| `LiteralValueExpr` (strings, numbers, bools)                 | ✅        |                     |
| `TemplateExpr` (quoted / interpolated strings)               | ✅        |                     |
| `TemplateWrapExpr`                                           | ✅        |                     |
| `ScopeTraversalExpr` (e.g. `var.foo`, `aws_instance.web.id`) | ✅        |                     |
| `ObjectConsExpr` / `ObjectConsKeyExpr` (object literals)     | ✅        |                     |
| `TupleConsExpr` (list literals)                              |           | ❌                  |
| `FunctionCallExpr`                                           |           | ❌                  |
| `ConditionalExpr`                                            |           | ❌                  |
| `ForExpr`                                                    |           | ❌                  |
| `SplatExpr`                                                  |           | ❌                  |
| `IndexExpr`                                                  |           | ❌                  |
| `RelativeTraversalExpr`                                      |           | ❌                  |
| `BinaryOpExpr` / `UnaryOpExpr`                               |           | ❌                  |
| `ParenthesesExpr`                                            |           | ❌                  |

[^ast-coverage]: This list is non-exhaustive and will likely be expanded as new expression types are added to the parser.
