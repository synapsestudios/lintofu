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

This extends ADR 0002's position from configuration to documentation. Severity
in the index applies the same `docs.severity ?? 'error'` default both config
builders apply, so the index cannot disagree with the severities the shipped
configs assign.

The same script enforces three invariants, each with its own message:

- a rule with no docs page
- a docs page with no matching rule
- a page whose first-line heading disagrees with its filename

They run in both write mode and `--check` mode, because generating an index that
links to a page that does not exist produces a dead link that fails the site
build later, further from the cause.

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

### The deploy workflow is gated on repository visibility

`.github/workflows/docs.yml` runs on push to `main` with two jobs. `build`
always runs and verifies the site still builds. `deploy` carries
`if: github.event.repository.visibility == 'public'`.

GitHub Pages published from a private repository on the team plan produces a
**publicly visible** site. Access-controlled Pages requires Enterprise Cloud,
which the organization does not have, so the site cannot go live until the
repository is public.

The gate is a condition rather than a follow-up pull request because a condition
is self-activating: the deploy happens on the first push to `main` after the
repository goes public, with nobody needing to remember. Meanwhile `main` stays
green, which a workflow that failed on every push until an unrelated issue
closed would not.

`actions/configure-pages` is deliberately absent from the `build` job. It calls
the Pages API and fails while Pages is not yet enabled on the repository, which
is the current state, so putting it in the always-running job would produce
exactly the red `main` the visibility gate exists to avoid. It is also
unnecessary: its job is to enable Pages and export a computed base path, and
`base` is hardcoded to `/lintofu/` in the VitePress config.

## Consequences

**Accepted:**

- A rule that ships without a docs page fails CI, which it did not before.
- The rule index cannot drift from rule metadata; the README table could and did.
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
- The site URL 404s until the repository is public. The README carries both the
  site link and the in-repo `./docs/rules/index.md` path so it stays useful in
  the interim.
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
