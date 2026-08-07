import { describe, expect, it } from 'vitest';
import { buildRecommendedRules } from '../src/configs/recommended.js';
import { rules } from '../src/rules/index.js';
import {
  findRuleDescriptionProblems,
  renderRuleIndex,
  toRuleIndexEntries,
} from './render-rule-index.js';

describe('the shipped rule barrel', () => {
  const entries = toRuleIndexEntries(rules);

  it('produces an entry for every rule', () => {
    expect(entries).toHaveLength(Object.keys(rules).length);
    expect(entries.length).toBeGreaterThan(0);
  });

  it('gives every rule a non-empty description', () => {
    expect(findRuleDescriptionProblems(entries)).toEqual([]);
  });

  // Asserted against the rendered markdown rather than the entries: the entry
  // type already constrains severity to the two values, so checking it there
  // is provably true and tests nothing. The rendered cell is a plain string.
  it('renders every severity cell as error or warn', () => {
    const severityCells = renderRuleIndex(entries)
      .split('\n')
      .filter((line) => line.startsWith('| ['))
      .map((line) => line.split('|')[3]?.trim());

    const invalid = severityCells.filter(
      (cell) => cell !== 'error' && cell !== 'warn',
    );
    expect(invalid).toEqual([]);
    expect(severityCells).toHaveLength(entries.length);
  });

  // Both sides resolve severity through resolveRuleSeverity, so this can only
  // fail if someone re-forks the `?? 'error'` default into its own copy. That
  // is the exact regression the hoist removed, and the invariant adr 0007
  // claims, so it is worth a guard even though it cannot fail today.
  it('resolves severity through the same owner as the recommended config', () => {
    const configured = buildRecommendedRules(rules);

    const disagreements = entries
      .filter((each) => configured[`lintofu/${each.name}`] !== undefined)
      .filter((each) => configured[`lintofu/${each.name}`] !== each.severity);

    expect(disagreements).toEqual([]);
  });
});
