# ADR 0001 — The project is experimental because `syscall/js` is experimental

**Status:** Accepted
**Date:** 2026-04-23

## Context

`lintofu` exposes an ESLint `Language` for OpenTofu. Rules need a faithful AST with per-node source ranges, comments, and block/attribute identity. No maintained JavaScript HCL parser provides that today — the packages on npm are either inactive GopherJS transpiles (`@evops/hcl-terraform-parser`, `hcl-parser`) or value converters that throw away positions (`hcl2-parser`, `hcl-to-json-wasm`). HashiCorp's own `hclsyntax` (Go, in `hcl/v2`) is the only source of truth we can rely on.

To call it from JS we compile the Go wrapper to WebAssembly and expose a single function, `globalThis.__lintofu_parse`, from `parser-go/main.go`. That file imports [`syscall/js`](https://pkg.go.dev/syscall/js) — the package is the only way Go WASM code can register callables on `globalThis` and marshal values across the JS/Go boundary.

The Go team's own documentation for `syscall/js` is explicit:

> Package js gives access to the WebAssembly host environment when using the js/wasm architecture. Its API is based on JavaScript semantics.
>
> **This package is EXPERIMENTAL. Its current scope is only to allow tests to run, but not yet to provide a comprehensive API for users. It is exempt from the Go compatibility promise.**

That exemption from the compatibility promise is the operative fact. A future Go release can rename symbols, remove the package, or change value marshaling without warning. Our WASM build would break silently — or worse, compile and produce wrong results at runtime.

## Decision

We accept `syscall/js` as a load-bearing dependency for v0.x. In exchange, **`lintofu` is itself experimental** until one of the following happens:

1. `syscall/js` graduates out of experimental status and gains compatibility-promise coverage.
2. We replace it with a stable alternative — `GOOS=wasip1` + the Component Model / WIT bindings if those mature, a CGo native addon, or a vendored stable shim we maintain ourselves.
3. We swap the Go parser for a parser that doesn't need `syscall/js` at all (unlikely without a maintained JS HCL parser first).

Until then:

- **Version `0.x.y` only.** We will not cut a `1.0` while the parser depends on an experimental API.
- **Pinned Go version in CI.** We test against specific Go versions rather than "latest" so we catch `syscall/js` breakage in a controlled release rather than by surprise.
- **README carries the experimental warning.** Consumers should know this from the install step, not after a Go release breaks their build.

## Consequences

**Accepted:**
- We ship the only maintained solution in the space today.
- The parser has the fidelity rules need (ranges, comments, distinct node types for things like `TemplateWrapExpr`).
- No N-API build matrix, no per-platform binary shipping — one `.wasm` works everywhere.

**Accepted costs:**
- A future Go release can break us. Mitigation: pinned Go in CI; a prominent README warning.
- The tarball is ~7 MB (mostly the `.wasm` artifact). Not ideal but within tolerance for a dev-time tool.
- Cold-start overhead (~100 ms) per ESLint process to boot WASM.

**Rejected alternatives:**
- Reimplement HCL parsing in pure JavaScript. Rejected: HCL v2's spec is non-trivial and drifts; maintaining a parallel parser would be a full-time project. The existing unmaintained JS parsers are evidence of how that plays out.
- Use one of the existing JS HCL parsers. Rejected: none preserve the positional and structural information rules need.

## References

- [`syscall/js` package docs](https://pkg.go.dev/syscall/js) — "EXPERIMENTAL" declaration
- [Go compatibility promise](https://go.dev/doc/go1compat) — what `syscall/js` is explicitly exempt from
- [hashicorp/hcl issue #627](https://github.com/hashicorp/hcl/issues/627) — why HCL↔JSON round-trips aren't an alternative
