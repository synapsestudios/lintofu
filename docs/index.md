---
layout: home

hero:
  name: lintofu
  text: Lint OpenTofu with ESLint
  tagline: An ESLint language plugin that parses .tf and .tofu with HashiCorp's own hcl/v2, so OpenTofu conventions are enforced by the linter you already run.
  actions:
    - theme: brand
      text: Get started
      link: /user-guide/getting-started
    - theme: alt
      text: Browse the rules
      link: /rules/
    - theme: alt
      text: Developer guide
      link: /developer-guide/architecture

features:
  - title: Real HCL2, not a reimplementation
    details: The parser wraps github.com/hashicorp/hcl/v2/hclsyntax compiled to WebAssembly, so the AST and its source positions match what OpenTofu itself sees.
  - title: One toolchain
    details: Rules, severities, autofixes, editor integration, and CI reporting come from ESLint. There is no second linter to configure.
  - title: Cross-file awareness
    details: Rules read a lazily built per-directory index, which matches OpenTofu's module boundary, so a rule can resolve a reference to the block that defines it.
---

## Where to go next

- **[User guide](./user-guide/getting-started.md)**: install `lintofu`, wire it into `eslint.config.js`, and pick a config tier.
- **[Rules](./rules/index.md)**: every shipped rule with its description, severity, category, recommended flag, and whether it autofixes. Generated from rule metadata.
- **[Developer guide](./developer-guide/architecture.md)**: how the parser is built, what parser services rules can reach for, and how to write a rule of your own.

Pre-1.0. The API and the rule set may still change. See
[ADR 0001](https://github.com/synapsestudios/lintofu/blob/main/docs/adr/0001-syscall-js-experimental.md)
for why the project stays on `0.x`.
