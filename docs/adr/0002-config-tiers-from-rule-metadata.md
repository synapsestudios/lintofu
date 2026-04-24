# ADR 0002 — Derive config tiers from rule metadata

**Status:** Accepted
**Date:** 2026-04-24

## Context

`lintofu` exports tier configs (today just `configs.recommended`) alongside its rule map. We need a way to decide which rules belong to which tier, and at what severity, without the decision drifting out of sync with the rules themselves.

Three reasonable options:

1. **Directory split.** Put rules into `src/rules/recommended/`, `src/rules/extra/`, etc. Tier membership is implied by location.
2. **Hand-written config tables.** Keep rules flat; hand-list each rule + severity under `configs.recommended.rules` in `src/index.ts`. This was the state before this ADR.
3. **Derive from rule metadata.** Each rule declares its tier and default severity in its own `meta.docs`; configs are built by iterating the rule map.

Looking at how maintained plugins handle this:

- [`@typescript-eslint/eslint-plugin`](https://github.com/typescript-eslint/typescript-eslint/tree/main/packages/eslint-plugin) keeps rules flat in `src/rules/` and defines tier configs under `src/configs/` (`recommended`, `strict`, `stylistic`, `all`, `disable-type-checked`).
- [`eslint-plugin-import`](https://github.com/import-js/eslint-plugin-import) keeps rules flat and defines configs (`recommended`, `errors`, `warnings`, `typescript`, `react`, …) in a top-level `config/` directory.
- [`eslint-plugin-react`](https://github.com/jsx-eslint/eslint-plugin-react/tree/master/lib/rules) keeps `lib/rules/` flat.
- [`eslint-plugin-unicorn`](https://github.com/sindresorhus/eslint-plugin-unicorn) keeps `rules/` flat and builds `configs.recommended` by filtering rules on `meta.docs.recommended`.

No popular plugin ties tier membership to folder layout. Unicorn's approach (derive configs from per-rule metadata) is the most duplication-free of the three options above.

The ESLint core types already support this: `RulesMetaDocs.recommended` is typed `unknown` with an explicit note that plugins may use it as they see fit, and `RulesMeta` takes an `ExtRuleDocs` generic that lets a plugin extend `meta.docs` with its own typed fields.

## Decision

Tier membership and default severity live in each rule's `meta.docs`. `configs.recommended.rules` is derived by iterating the plugin's rule map. There are no tier-named subdirectories.

Concretely:

- `src/rules/types.ts` exports a `LintofuRuleDocs` interface with `recommended?: boolean` and `severity?: "error" | "warn"`. Every rule sets `ExtRuleDocs: LintofuRuleDocs` on its `RuleDefinition` and populates `meta.docs.recommended` and `meta.docs.severity`.
- `src/configs/recommended.ts` exports `buildRecommendedRules(rules)`, a pure function that returns `{ "lintofu/<name>": severity }` for each rule whose `meta.docs.recommended === true`.
- `src/index.ts` imports the rule map from `src/rules/index.ts` and passes it to `buildRecommendedRules` when assembling `configs.recommended`.

## Consequences

**Accepted:**

- Single source of truth per rule. Adding a rule to the recommended tier is a one-line change in the rule file.
- `LintofuRuleDocs` is type-checked, so the metadata shape is enforced at compile time.
- Extension is additive. A future `strict` tier adds a field to `LintofuRuleDocs` and a `buildStrictRules` helper; no folder restructuring required.
- The helper is a pure function with no dependency on the WASM parser boot, so it is unit-testable in milliseconds.

**Accepted costs:**

- `configs.recommended.rules` is computed at plugin import rather than written out literally. A rule that forgets to set `meta.docs.recommended` silently falls out of the tier. Mitigated by `src/configs/recommended.integration.test.ts`, which asserts the derived config against an explicit expected mapping.
- One extra file (`src/rules/index.ts` barrel) exists so the helper can be tested without importing `src/index.ts` (which triggers WASM boot via top-level `await initialize()`).

**Rejected alternatives:**

- **Directory split (`core/recommended/`, `core/extra/`).** Speculative (no `extra` rules exist today). Diverges from how the ecosystem handles this. Mixes two independent axes (severity tier vs topic family) onto a single folder path, which creates combinatoric layout problems if topic families are ever introduced.
- **Hand-written config tables.** The previous approach. Required touching three places per rule (import, rule-map entry, severity entry), and nothing typed-checked a rule's presence in the tier.

## References

- `src/configs/recommended.ts`, `src/rules/types.ts`
- [`@eslint/core` `RulesMetaDocs`](https://github.com/eslint/rewrite/blob/main/packages/core/src/types.ts)
- `eslint-plugin-unicorn`'s `index.js` config derivation as the reference implementation.
