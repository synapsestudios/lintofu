# ADR 0006: tsdoc required on the public import path

**Status:** Accepted
**Date:** 2026-07-18

## Context

The package root exports the whole rule-authoring surface: the plugin object, the language, the rule-authoring types, the AST node types, and the parser services. Without doc comments, hover and autocomplete show bare type shapes, and a custom-rule author leaves the editor to read the README or the source. Some semantics lived only in the README or nowhere at all: the project index's module-directory scope and mtime-based cache invalidation, the empty-index fallback for files without a physical path, and the way `recommended`, `severity`, and `category` drive the generated config tiers (ADR 0002).

tsdoc puts that documentation where authors already work. `tsc` runs with `declaration: true`, so the comments travel into the published `dist/*.d.ts` and surface in any consumer's editor.

A requirement without enforcement decays: the next public declaration lands without docs and nobody notices. The repo already gates every PR with `npm run lint:ci` (`typescript_fast_checks.yml`, reused by `pull_request.yml`, plus lefthook pre-commit), so lint is the natural enforcement point.

## Decision

Every declaration on the public import path carries a tsdoc comment. The boundary is whole modules, not individual declarations:

- **In scope:** `src/index.ts`, `src/types.ts`, `src/language.ts`, `src/rules/types.ts`, `src/parser/types.ts`, `src/source-code.ts`, `src/project-index.ts`.
- **Exempt:** `src/parser/index.ts`, `src/configs/*`, `src/rules/index.ts` and all rule implementations, `src/visitor-keys.ts`, and tests.

Module-level exports inside in-scope files count even when not re-exported from the root (`getProjectIndex`, `TofuNode`, `NodeType`, `Diagnostic`, `ParseResult`, `BinaryOp`, `UnaryOp`): whole-file scope is simpler than per-declaration carve-outs, and several of these surface on hover anyway (union members appear after narrowing on `type`).

Enforcement is two plugins scoped to exactly those files in `eslint.config.mjs`:

- `jsdoc/require-jsdoc` (eslint-plugin-jsdoc) enforces presence on exported declarations.
- `tsdoc/syntax` (eslint-plugin-tsdoc) validates that every doc comment in the scoped files is well-formed tsdoc.

The configuration, verbatim:

```js
{
  files: [
    'src/index.ts',
    'src/types.ts',
    'src/language.ts',
    'src/rules/types.ts',
    'src/parser/types.ts',
    'src/source-code.ts',
    'src/project-index.ts',
  ],
  plugins: { jsdoc: jsdocPlugin, tsdoc: tsdocPlugin },
  rules: {
    'tsdoc/syntax': 'error',
    'jsdoc/require-jsdoc': [
      'error',
      {
        publicOnly: true,
        require: {
          ClassDeclaration: true,
          FunctionDeclaration: true,
          MethodDefinition: true,
        },
        contexts: ['TSInterfaceDeclaration', 'TSTypeAliasDeclaration'],
        exemptEmptyConstructors: true,
      },
    ],
  },
}
```

No workflow changes: `lint:ci` already runs in `typescript_fast_checks.yml` and in lefthook pre-commit, so a missing doc comment on a new public declaration fails CI today.

Style: doc bodies follow the repo voice, terse fragments over full paragraphs. Field-level docs are written where a field carries semantics the type does not show; they are mandatory on `LintofuRuleDocs`, whose fields drive the config tiers.

## Consequences

**Accepted:**

- Docs live at the hover point and ship in the published d.ts; the README keeps the narrative versions, the types keep the reference versions.
- A new public declaration without tsdoc fails `lint:ci` on the PR that adds it.

**Accepted costs:**

- The plugin default export in `src/index.ts` is an object literal, so its property docs are convention plus `tsdoc/syntax` checking, not presence-enforced; `jsdoc/require-jsdoc` has no sensible target there.
- Interface property docs outside `LintofuRuleDocs` are judgment calls; lint only guarantees declaration-level coverage.
- Two more devDependencies (`eslint-plugin-jsdoc`, `eslint-plugin-tsdoc`).

**Rejected alternatives:**

- **A generated docs site (typedoc, api-extractor).** Heavier toolchain, and hover still shows nothing without the comments; the comments are the docs source either way.
- **Documenting only root re-exported names.** Leaves union members (`IndexExpr` and friends) blank exactly where authors meet them, after narrowing `Expression` on `type`.
- **A doc-coverage tool outside eslint.** A second toolchain and CI step when `lint:ci` already gates every PR.

## References

- [tsdoc.org](https://tsdoc.org)
- [eslint-plugin-jsdoc](https://github.com/gajus/eslint-plugin-jsdoc)
- [eslint-plugin-tsdoc](https://github.com/microsoft/tsdoc)
- ADR 0002 (config tiers from rule metadata)
- Issue #123
