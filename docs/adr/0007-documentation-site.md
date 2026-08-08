# ADR 0007: a generated documentation site on GitHub Pages

**Status:** Accepted
**Date:** 2026-08-07

## Context

Documentation lived in two places that could not both stay correct. The README
carried a 46-row rule table, hand-maintained, whose descriptions had been
reworded away from `meta.docs.description` and whose ordering had already
diverged from `src/rules/index.ts`. `docs/rules/` carried one page per rule, and
nothing verified that the two sets matched: a rule could ship with no docs page
and no check would notice.

The README also carried contributor material (parser services, rule authoring,
the parser architecture) that nobody reads on an npm package page, while a user
looking for a full configuration reference had nowhere to go.

ADR 0002 established that rule metadata is the source of truth for the generated
config tiers. The same argument applies to documentation, and had not been
applied yet.

## Decision

### Platform: GitHub Pages plus VitePress, rooted at `docs/`

VitePress builds `docs/` into a static site with built-in local search, no
search service to run and no index to host. Rooting the site at `docs/` rather
than a separate directory keeps the existing `./docs/rules/*.md` links in the
README resolving on GitHub, and keeps `docs/rules/` browsable in the repository
for anyone who never visits the site.

`docs/adr/**` sits in `srcExclude`. ADRs are a repository artifact, read in
context with the code and its history, not user-facing documentation.

Dead-link checking stays strict. `ignoreDeadLinks` is not set. A documentation
site whose links rot silently is the failure mode this work exists to prevent,
so any link that breaks fails the build.

### The rule index is generated from `meta.docs`

`scripts/render-rule-index.ts` reads the rule barrel and writes
`docs/rules/index.md`: one row per rule with its description, severity,
category, recommended flag, and whether it autofixes. `npm run docs:rules`
writes it; `npm run docs:rules:check` fails when it is stale.

This extends ADR 0002's position from configuration to documentation.

Severity has a single owner: `resolveRuleSeverity` in `src/rules/types.ts`,
which supplies the `'error'` default a rule omitting `meta.docs.severity`
documents. Both generated config tiers and the generated rule index resolve
severity through it, so the documented severity cannot disagree with the
severity the shipped configs assign. That is an enforced invariant rather than a
claim: the default exists in exactly one place, and a test asserts the index and
`buildRecommendedRules` agree across the whole barrel. Writing the default out
independently in each reader, which is what this replaced, made the invariant
true only by coincidence.

The same script enforces four invariants, each with its own message:

- a rule with no docs page
- a docs page with no matching rule
- a page whose first-line heading disagrees with its filename
- a rule with an empty `meta.docs.description`

The description check has no sensible default to fall back on, unlike severity
and category. A rule with no description renders a blank table cell while every
gate stays green, which fails the "lists every rule with its description"
requirement silently.

All four run in both write mode and `--check` mode, because generating an index
that links to a page that does not exist produces a dead link that fails the
site build later, further from the cause.

**Validation does not block generation.** A failing invariant reports on stderr
and fails the run, but write mode still regenerates `docs/rules/index.md`.
`npm run docs:rules` is the fix that both the stale-index message and the
generated file's own header point at, so it has to work in exactly the situation
that sends someone to it. An early exit on the first problem meant the
documented fix silently did nothing whenever a rule was missing its docs page.
`--check` never writes, and no path returns success while a problem exists; the
decision is a pure function, `decideIndexOutcome`, so both halves of that rule
are tested rather than asserted here.

The fixable column is included even though the issue's acceptance list does not
name it. The deleted README table carried hand-written "autofixable"
annotations, so removing the table without replacing that signal would take away
information users can see today. The generated column reads `meta.fixable` and
therefore covers a different set of rules than the hand-written annotations did;
the generated one is correct.

The generator runs under `tsx`. Keeping the pure functions in TypeScript lets
the CLI, the VitePress config, and the unit tests import one module rather than
three copies of the same mapping.

### The sidebar is computed at config-load time, not committed

`docs/.vitepress/config.mts` calls `buildRuleSidebar(toRuleIndexEntries(rules))`
against the same barrel and the same functions the generator uses. Only
`docs/rules/index.md` is a committed artifact.

This is the smallest set of generated files that still browses well on GitHub. A
committed sidebar would be a second artifact that can go stale; a computed one
cannot, by construction. Adding a rule with its docs page is therefore enough to
put it on the site, with no hand edits anywhere.

Ordering lives in one function, `groupRulesByCategory`, consumed by both the
markdown table and the sidebar, so the two cannot drift into different orders.
Rules with no `category` default to `core`, matching the `src/rules/core/`
directory and the config-tier vocabulary.

### The site deploys from a private repository, and is publicly visible

`.github/workflows/docs.yml` runs on push to `main` with two jobs. `build`
verifies the site still builds, enables Pages, and uploads the artifact.
`deploy` publishes it. Neither is conditional.

GitHub Pages published from a private repository on the team plan produces a
**publicly visible** site. Access-controlled Pages requires Enterprise Cloud,
which the organization does not have. The documentation being world-readable
while the source repository stays private is an accepted consequence, decided
deliberately rather than inherited: the docs describe rules whose content is
intended to be public under #124 anyway, and waiting for the repository to flip
would leave the site dark for no benefit.

An earlier revision gated both the artifact upload and the `deploy` job on
`if: github.event.repository.visibility == 'public'`, so the site would
self-activate once #128 and #129 landed. That gate is gone. It existed only to
avoid publishing early, and publishing early is now the intent.

`actions/configure-pages` runs with `enablement: true`, which turns Pages on if
it is off. This is what lets the workflow deploy without an out-of-band change
to repository settings, and it is the only reason the step is present: the base
path it exports is unused, because `base` is hardcoded to `/lintofu/` in the
VitePress config. `pages: write` is scoped to the `build` job for the same
reason rather than raised to the top level.

## Consequences

**Accepted:**

- A rule that ships without a docs page, or without a description, fails CI.
  Neither did before.
- The rule index cannot drift from rule metadata; the README table could and did.
- The `'error'` severity default has one owner instead of one copy per reader.
- The README shrinks to what an npm consumer needs and links out for the rest.
- Adding a rule with its docs page puts it on the site with no hand edits.

**Accepted costs:**

- VitePress pulls in Vue, Vite, and Shiki. That is real weight in `npm ci` time
  for the docs check job and in Dependabot churn. The existing `dev-dependencies`
  Dependabot group is declared by `dependency-type: development` with no
  patterns filter, so it already covers the new tree without configuration.
- Regenerating the index rewrites close to all 46 descriptions, replacing
  hand-reworded table prose with `meta.docs.description` verbatim. A large diff,
  and the point of the change.
- The site is publicly readable while the repository is private. Anything added
  under `docs/` is published on the next push to `main`, so it is not a place
  for anything the repository's privacy is protecting.
- The README carries both the site link and the in-repo `./docs/rules/index.md`
  path. Kept after the site went live, because the in-repo path is what resolves
  when reading the README from the npm tarball.
- The user guide and the README overlap on install and usage. They are kept as
  different documents: the README is the quickstart, the user guide is the full
  configuration reference.

**Rejected alternatives:**

- **`eslint-doc-generator`.** This is the ecosystem standard for the job;
  `eslint-plugin-unicorn`, `eslint-plugin-jest`, and others use it to generate a
  README rule table and per-rule doc headers from plugin metadata. It is rejected
  here for two concrete reasons. It loads the plugin's **entry point**, and
  `src/index.ts` carries a top-level `await initialize()` that boots the WASM
  parser, so rendering documentation would require a build and a Go toolchain
  on any machine that wants to update the docs. It also wants to rewrite the
  headers of all 46 rule pages, which is out of scope for this work. Reading the
  wasm-free `src/rules/index.ts` barrel directly costs one small script and
  keeps the docs job free of Go entirely.
- **Building first and importing `dist/rules/index.js`.** Couples the pre-commit
  hook to a full `tsc` run and forces the CI step to sit after the build, which
  is backwards for a fast check.
- **`vite-node` instead of `tsx`.** It is a transitive dependency of Vitest, not
  a declared one. Depending on an undeclared package breaks on the next lockfile
  refresh.
- **A check-only Vitest test instead of a generator.** Solves the drift check
  and leaves the writing by hand, which is the half that actually rots.
- **Committing the sidebar.** A second generated artifact that can go stale,
  buying nothing over computing it at config load.
- **Duplicating the support matrix and tested provider versions into the site.**
  The README is the npm package page (`files: ["dist", "README.md"]`), so
  stripping version-support information from it is a regression for consumers.
  Carrying it in both places would create the drift this ADR exists to remove;
  the user guide links out to the README section instead.
- **A mermaid plugin for the architecture diagram.** The diagram is a five-node
  linear flow. A plain fenced text diagram renders identically everywhere and
  keeps `vitepress-plugin-mermaid` and mermaid out of the dependency tree.

## References

- ADR 0002 (config tiers from rule metadata)
- ADR 0005 (version support policy)
- [VitePress](https://vitepress.dev)
- [eslint-doc-generator](https://github.com/bmish/eslint-doc-generator)
- [GitHub Pages visibility and Enterprise Cloud](https://docs.github.com/en/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site)
- Issue #131, epic #124
