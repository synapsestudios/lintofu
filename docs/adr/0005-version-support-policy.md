# ADR 0005: Provider and CLI version support policy

**Status:** Accepted
**Date:** 2026-07-18

## Context

Users are realistically behind on versions. Shops still run AWS provider v4 and v5, and Terraform users sit on older CLI releases than OpenTofu users (epic #16). lintofu wants to be useful to them without carrying version-shim code for resources that were renamed or removed several majors ago.

The sibling issues set up the machinery: #17 tests rules per provider version, #130 documents the support matrix, and #18 renders the tested-versions list into the README. This ADR is the policy those implement. #17 is open, so nothing here may depend on the test harness existing.

Parsing goes through HashiCorp's `hcl/v2` compiled to WASM (ADR 0001, `parser-go/go.mod` pins v2.24.0). `hcl/v2` only parses HCL2 native syntax, the syntax that shipped with Terraform 0.12. That is a hard technical floor independent of any policy choice.

The guiding principle from #16 is support more, hack less. When a rule only makes sense on some provider versions, declare that in rule metadata instead of branching on version inside rule code. We would rather drop a rule from an older major's effective rule set than maintain an `if providerVersion < 6` branch forever.

## Decision

### 1. Provider major window

Latest major plus one prior major, fully supported. For AWS today that is v6 and v5. Older majors (v4 and earlier) are best effort: rules still run and the parser handles the syntax, but false positives from removal rules aimed at newer majors are expected and handled per decisions 4 and 5, never with version branches in rule code. When a provider ships a new major, the window moves to new latest plus previous, and rules whose advice only holds from the new major declare it via `appliesTo`.

### 2. Provider minor window inside a supported major

All minors of a supported major are supported by policy. CI verifies the latest minor plus the two prior minors, ratifying the window #17 committed to. Once #17 lands, the version list lives as data in one place and downstream tooling reads it. Tested minors are the verified subset, not the support boundary.

### 3. Terraform and OpenTofu CLI versions

The hard floor is HCL2 syntax, so Terraform 0.12 and newer. Every OpenTofu release is above the floor (OpenTofu forked from Terraform 1.5 and started at 1.6). The promise: all OpenTofu releases and Terraform 1.x are supported. Terraform 0.12 through 0.15 is parse-and-lint best effort, and deliberately so; several core rules (`no-legacy-list-function`, `no-legacy-map-function`, `no-legacy-count-attribute`, `no-bool-as-count`, `no-legacy-lookup`, `no-legacy-dot-index`) exist precisely to help those users migrate. lintofu never executes the CLI, so "support" means the syntax parses and rule advice is valid for that generation. `.tf.json` and `.tofu.json` stay unsupported regardless (README known limitations).

### 4. Version-conditional rules

Declarative metadata, no runtime enforcement. `meta.docs.appliesTo` is an optional `Record<string, string>` on `LintofuRuleDocs` mapping a key to a semver range string:

```ts
docs: {
  description: '...',
  recommended: true,
  severity: 'error',
  category: 'aws',
  appliesTo: { aws: '>=6.0.0' },
},
```

Keys are provider short names (`aws`) or CLI names (`opentofu`, `terraform`). Absent means the rule applies to all supported versions. Consumers: the #130 support matrix, the #17 harness (skip a rule on fixture versions outside its range), and rule docs.

It is not enforced at lint time. The package carries no semver library, and deriving the user's real provider version from `required_providers` constraint strings (ranges like `~> 5.0`, or nothing at all) is unreliable. Users on an older major turn off the rules that do not apply to them, per rule in their config or by filtering on `plugin.rules` metadata.

This ADR ships with the worked example: the field on `LintofuRuleDocs` plus `appliesTo` on the four AWS v6 removal rules (`no-eip-vpc-attribute`, `no-instance-cpu-count-attributes`, `no-eks-addon-resolve-conflicts`, `no-api-gateway-deployment-stage-args`) and the one v5 removal rule (`no-db-instance-name-attribute`). Populating CLI keys on the core legacy-syntax rules is follow-up work.

### 5. Bug reports from unsupported versions

Label `unsupported-version`, canned response, close as not planned unless the fix is an `appliesTo` bound. Canned response text, verbatim so triage can paste it:

> thanks! that provider/cli version is outside the support window (see docs/adr/0005-version-support-policy.md). we don't carry version branches in rule code, but a PR adding or tightening `meta.docs.appliesTo` on the rule is very welcome, and you can disable the rule in your config in the meantime.

A bug-report issue form that asks for provider and tofu/terraform versions lands with #124's community-intake work, not here.

## Consequences

**Accepted:**

- One rule implementation per rule. No version branches, no runtime semver dependency.
- The policy is legible from metadata: anything version-scoped says so in `meta.docs.appliesTo`, and downstream tooling (#17, #18, #130) reads it instead of inventing its own list.
- Old-codebase users keep getting value: the parser floor is 0.12 and the legacy-syntax core rules target exactly the migration audience.

**Accepted costs:**

- Users on out-of-window majors see advice that does not apply until they disable those rules; nothing warns them automatically.
- `appliesTo` ranges are hand-maintained and unverified until #17's harness exercises them.
- The major window is revisited manually whenever a provider ships a new major; nothing automates the rollover.

**Rejected alternatives:**

- **Runtime version guard.** Parse `required_providers`, intersect ranges, skip rules at lint time. Unreliable (constraints are ranges or absent), needs a semver dependency the package does not have, and moves version logic into every rule run.
- **Separate rules per provider major.** Multiplies the rule count and the docs surface for what is one piece of advice with a version bound.
- **Latest major only.** Simplest window, but #16's audience notes say the bulk of real usage is one or more majors back; supporting only the latest makes the plugin useless to the people it targets.
- **Version branches inside rule code.** The exact thing #19 rules out; every branch is permanent maintenance for a shrinking audience.

## References

- Epic #16 and issues #19 (this policy), #17 (version test harness, open), #18 (tested-versions rendering), #130 (support matrix), #124 (open-source intake)
- ADR 0001 (WASM parser, `hcl/v2`), ADR 0002 (config tiers from rule metadata, the `LintofuRuleDocs` extension point)
- `parser-go/go.mod` (`hcl/v2` v2.24.0)
- [AWS provider v5 upgrade guide](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-5-upgrade), [AWS provider v6 upgrade guide](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-6-upgrade)
