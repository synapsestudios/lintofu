# ADR 0003: Conventional commits for all commit messages and PR titles

**Status:** Accepted
**Date:** 2026-06-30

## Context

Versioning and publishing run through release-please (`.github/workflows/release.yml`, `release-please-config.json`). release-please reads commit messages to compute the next version and to write `CHANGELOG.md`: a `feat:` commit bumps the minor, a `fix:` commit bumps the patch, and a `feat!:` commit or a `BREAKING CHANGE:` footer bumps the major. By default a breaking change at 0.x goes straight to 1.0.0. The config sets `bump-minor-pre-major`, so a breaking change bumps the minor and the version stays in 0.x, which ADR 0001 requires until `syscall/js` stabilizes.

This repository squash-merges pull requests, so the squashed commit subject is the PR title. The PR title is therefore the message release-please parses on `main`.

A title that does not follow the Conventional Commits grammar cannot be parsed. When PR #65 merged with the subject `replace the publish workflow with release-please (#65)`, release-please failed on it ("unexpected token ' '") and counted zero releasable commits, so it opened no release PR. A non-conventional message also produces no changelog entry, so the record of what shipped becomes incomplete.

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) is the grammar release-please expects, and it is the de facto standard the surrounding tooling (release-please, commitlint, changelog generators) is built around.

## Decision

All commit messages and all PR titles in this repository follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

A message starts with a type, an optional scope, an optional `!`, then a colon and a short summary:

```
<type>[optional scope][!]: <summary>
```

Types and their release impact:

- `feat:` a new feature. Bumps the minor.
- `fix:` a bug fix. Bumps the patch.
- `feat!:`, `fix!:`, or any type carrying a `BREAKING CHANGE:` footer. Bumps the major by default. The config sets `bump-minor-pre-major`, so while the project is pre-1.0 a breaking change bumps the minor and the version stays in 0.x (ADR 0001).
- `chore:`, `ci:`, `docs:`, `test:`, `refactor:`, `build:`, `perf:`, `style:`. Land without cutting a release.

Because the repo squash-merges, the PR title is the message of record and must satisfy this grammar. Commits on a feature branch are squashed away, so the binding requirement sits on the PR title; branch commits should follow the same grammar so history reads consistently.

The summary stays lowercase, terse, and casual after the type prefix, matching the project's existing voice.

## Consequences

**Accepted:**

- release-please computes versions and the changelog automatically from history, with no manual version step.
- The changelog reflects every shipped change, grouped by type.
- `bump-minor-pre-major` keeps breaking changes inside 0.x. Without it, the first `feat!:` would publish 1.0.0 and break ADR 0001.
- Release timing stays a human decision: contributors merge feature PRs, and a release happens when the maintainer merges the release PR release-please prepares.

**Accepted costs:**

- Contributors learn the Conventional Commits grammar and apply it to PR titles.
- Enforcement today is by convention and code review. A non-conventional title that reaches `main` is silently ignored by release-please, and nothing blocks such a merge. A PR-title lint check (for example a commitlint action on the `pull_request` event) can close that gap later if drift becomes a problem.

**Rejected alternatives:**

- **No commit convention, manual versioning.** This is the state that produced the #65 failure. It puts version bumps and changelog upkeep back on a person and reintroduces the tag and `package.json` drift that release-please removes.
- **Convention on merge commits only, free-form branch commits.** The repo squash-merges, so the squashed subject is the only message that lands on `main`. The PR title is the natural and sufficient enforcement point.

## References

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [release-please-action](https://github.com/googleapis/release-please-action) and `.github/workflows/release.yml`
- [release-please config schema](https://github.com/googleapis/release-please/blob/main/schemas/config.json), `bump-minor-pre-major`
- ADR 0001, which keeps the project on 0.x until `syscall/js` stabilizes
- PR #65 (introduced release-please) and PR #66 (bootstrapped the first release)
