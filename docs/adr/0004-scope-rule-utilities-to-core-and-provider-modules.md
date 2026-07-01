# ADR 0004 — Scope rule utilities to core and provider modules

**Status:** Accepted
**Date:** 2026-07-01

## Context

`src/rules/utils.ts` holds every helper any rule uses. Two groups of helper live in that file. Generic HCL and parser helpers (`collectTraversals`, `traversalText`, `traversalHead`, `literalStringValue`, `findAttribute`, `objectItemKeyName`, `blockLabel`, `checkDescription`) read and interpret the parsed AST and apply to any rule. AWS provider helpers (`engineName`, `autoMinorUpgradeEnabled`) read RDS-specific attributes and apply only to the aws ruleset. The AWS helpers arrived in #78 when the aurora rule extracted them from two engine rules.

The rules themselves already split by family: `src/rules/core` and `src/rules/aws`. The utilities do not follow that split. A core rule and an aws rule import from the same file, so a core rule's import surface includes provider helpers it can never use. The file grows each time a provider rule needs a helper, which places provider domain logic on the shared import path for core rules. This is the divergent-change signal: one file changes for core parser reasons and for aws provider reasons.

## Decision

Rule utilities are scoped to the rule family that uses them, matching the existing `core`/`aws` folder split.

- `src/rules/core/utils.ts` holds the generic HCL and parser helpers.
- `src/rules/aws/utils.ts` holds the AWS provider helpers.
- A new provider gets its own `src/rules/<provider>/utils.ts` when it arrives.

The placement test is whether a helper encodes provider semantics, not which rules currently call it. A helper that reads a provider-specific attribute or resource type belongs in that provider's module. A helper that operates on the generic AST or on plain values belongs in core. `trimNumericVersion` reads no provider concept (it trims a dotted numeric string to a given depth), so it lives in core even though only aws rules call it today.

Dependencies between the modules run in one direction. A provider utilities module may import from `core/utils.ts`, because provider helpers build on the generic ones (`engineName` calls `findAttribute` and `literalStringValue`). `core/utils.ts` imports from no provider module. A provider module never imports from another provider module.

An eslint `no-restricted-imports` rule enforces the direction. Files under `src/rules/core/**` cannot import from a provider directory, so an aws helper cannot drift back onto the core import path by a stray import.

## Consequences

**Accepted:**

- A rule's import surface is limited to the helpers it can use. A core rule sees the core helpers; an aws rule sees the core helpers plus the aws helpers.
- The utilities follow the same family split as the rules, so a helper's location tells you which rules it serves.
- The one-directional dependency keeps core independent of any provider. Core rules and their utilities build and test without provider code present.
- The boundary is structural. The lint rule fails a core-into-provider import at CI rather than relying on review to catch it.

**Accepted costs:**

- An aws rule that uses both generic and provider helpers imports from two modules (`../../core/utils.js` and `./utils.js`) instead of one. The two import lines state where each helper comes from.
- Adding a provider means adding a `utils.ts` under its folder. A provider with no helpers needs no such file.

**Rejected alternatives:**

- **Keep the single `src/rules/utils.ts`.** The file mixes core and provider concerns on one import path and grows with every provider. This is the state the decision replaces.
- **Re-export core helpers through each provider's `utils.ts` for a single import surface.** This puts the full core helper set back on the provider import path, which reintroduces the surface problem the split removes.
- **Place `trimNumericVersion` in `aws/utils.ts` because only aws uses it today.** The helper carries no provider semantics, so a second provider that needs the same trim would duplicate it or force a later move. Core placement holds it where any provider can reach it.

## References

- `src/rules/core/utils.ts`, `src/rules/aws/utils.ts`
- `eslint.config.mjs` for the `no-restricted-imports` boundary rule
- #80 (this split), #78 (the aws helper extraction that motivated it)
- ADR 0002 for the existing decision to keep tier membership off the folder path, which this decision leaves intact
