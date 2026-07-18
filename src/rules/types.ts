/**
 * Metadata on a rule's `meta.docs` that drives the generated config tiers
 * (adr 0002).
 */
export interface LintofuRuleDocs {
  /** What the rule enforces. Shown by docs tooling. */
  description?: string;
  /**
   * `true` puts the rule in `configs.recommended`. A rule that omits this
   * (or sets it false) is in no generated tier at all, so it silently ships
   * unreachable unless users enable it by hand.
   */
  recommended?: boolean;
  /**
   * Severity the generated configs assign. Defaults to `'error'` when
   * omitted.
   */
  severity?: 'error' | 'warn';
  /**
   * Provider grouping. With `recommended: true` the rule also lands in the
   * `<category>/recommended` config (`aws/recommended` is the only one built
   * today).
   */
  category?: string;
  appliesTo?: Record<string, string>;
}
