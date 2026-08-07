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

/**
 * A rule seen through the metadata its readers need: the generated config
 * tiers and the generated rule index. Structural rather than the full
 * `OpenTofuRuleDefinition`, because the rule barrel's entries are
 * heterogeneous generic instantiations with differing `MessageIds` unions.
 */
export interface RuleWithDocs {
  /** Rule metadata. Optional so a stub or partial rule still type-checks. */
  meta?: {
    /** The block driving config tiers and the generated docs. */
    docs?: LintofuRuleDocs;
    /**
     * Set by a rule that ships a fixer. Mirrors eslint's own `meta.fixable`;
     * the generated rule index reports it as the fixable column.
     */
    fixable?: 'code' | 'whitespace';
  };
}

/**
 * Resolves the severity a rule is applied at, supplying the `'error'` default
 * that {@link LintofuRuleDocs.severity} documents for a rule omitting it.
 *
 * Both generated config tiers and the generated rule index read severity
 * through this function, so the documented severity cannot disagree with the
 * severity the shipped configs assign (adr 0002, adr 0007).
 *
 * @param docs - a rule's `meta.docs`, absent when the rule declares none.
 * @returns the resolved severity.
 */
export function resolveRuleSeverity(
  docs: LintofuRuleDocs | undefined,
): 'error' | 'warn' {
  return docs?.severity ?? 'error';
}
