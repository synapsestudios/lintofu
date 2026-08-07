import { describe, expect, it } from 'vitest';
import {
  buildRuleSidebar,
  findRuleDocsHeadingProblems,
  findRuleDocsParityProblems,
  groupRulesByCategory,
  renderRuleIndex,
  toRuleIndexEntries,
  type RuleIndexEntry,
} from './render-rule-index.js';

const CHECK_MARK = '✔';

/** Table rows whose first cell links a rule page, split on unescaped pipes. */
function ruleRows(markdown: string): string[][] {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('| ['))
    .map((line) =>
      line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split(/(?<!\\)\|/)
        .map((cell) => cell.trim()),
    );
}

function entry(overrides: Partial<RuleIndexEntry> = {}): RuleIndexEntry {
  return {
    name: 'a-rule',
    description: 'A rule.',
    severity: 'error',
    category: 'core',
    recommended: true,
    fixable: false,
    ...overrides,
  };
}

describe('toRuleIndexEntries', () => {
  it('maps a rule name and its meta.docs description into an entry', () => {
    const entries = toRuleIndexEntries({
      'documented-variables': {
        meta: {
          docs: { description: 'Every `variable` needs a description.' },
        },
      },
    });

    expect(entries).toEqual([
      expect.objectContaining({
        name: 'documented-variables',
        description: 'Every `variable` needs a description.',
      }),
    ]);
  });

  it('reads the severity declared in meta.docs', () => {
    const entries = toRuleIndexEntries({
      'no-splat-bracket-index': { meta: { docs: { severity: 'warn' } } },
    });

    expect(entries[0]?.severity).toBe('warn');
  });

  it('defaults severity to error when meta.docs.severity is absent', () => {
    const entries = toRuleIndexEntries({
      'documented-variables': { meta: { docs: {} } },
    });

    expect(entries[0]?.severity).toBe('error');
  });

  it('reads the category declared in meta.docs', () => {
    const entries = toRuleIndexEntries({
      'no-eip-vpc-attribute': { meta: { docs: { category: 'aws' } } },
    });

    expect(entries[0]?.category).toBe('aws');
  });

  it('defaults category to core when meta.docs.category is absent', () => {
    const entries = toRuleIndexEntries({
      'documented-variables': { meta: { docs: {} } },
    });

    expect(entries[0]?.category).toBe('core');
  });

  it('reads the recommended flag declared in meta.docs', () => {
    const entries = toRuleIndexEntries({
      'documented-variables': { meta: { docs: { recommended: true } } },
    });

    expect(entries[0]?.recommended).toBe(true);
  });

  it('defaults recommended to false when meta.docs.recommended is absent', () => {
    const entries = toRuleIndexEntries({
      'documented-variables': { meta: { docs: {} } },
    });

    expect(entries[0]?.recommended).toBe(false);
  });

  it('sets fixable true when meta.fixable is code', () => {
    const entries = toRuleIndexEntries({
      'no-legacy-list-function': { meta: { fixable: 'code' } },
    });

    expect(entries[0]?.fixable).toBe(true);
  });

  it('sets fixable false when meta.fixable is absent', () => {
    const entries = toRuleIndexEntries({
      'documented-variables': { meta: {} },
    });

    expect(entries[0]?.fixable).toBe(false);
  });

  it('yields an empty description when meta.docs is absent entirely', () => {
    const entries = toRuleIndexEntries({
      'documented-variables': { meta: {} },
    });

    expect(entries[0]?.description).toBe('');
  });

  it('yields an empty description when meta is absent entirely', () => {
    const entries = toRuleIndexEntries({ 'documented-variables': {} });

    expect(entries[0]?.description).toBe('');
  });

  it('preserves the order of the input record', () => {
    const entries = toRuleIndexEntries({
      zebra: {},
      alpha: {},
      middle: {},
    });

    expect(entries.map((each) => each.name)).toEqual([
      'zebra',
      'alpha',
      'middle',
    ]);
  });
});

describe('groupRulesByCategory', () => {
  it('returns an empty array for no entries', () => {
    expect(groupRulesByCategory([])).toEqual([]);
  });

  it('orders rules alphabetically inside a group', () => {
    const groups = groupRulesByCategory([
      entry({ name: 'zebra' }),
      entry({ name: 'alpha' }),
      entry({ name: 'middle' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.category).toBe('core');
    expect(groups[0]?.entries.map((each) => each.name)).toEqual([
      'alpha',
      'middle',
      'zebra',
    ]);
  });

  it('places the core group before any other category', () => {
    const groups = groupRulesByCategory([
      entry({ name: 'aws-rule', category: 'aws' }),
      entry({ name: 'core-rule', category: 'core' }),
    ]);

    expect(groups.map((group) => group.category)).toEqual(['core', 'aws']);
  });

  it('orders non-core categories alphabetically', () => {
    const groups = groupRulesByCategory([
      entry({ name: 'g-rule', category: 'gcp' }),
      entry({ name: 'a-rule', category: 'azure' }),
      entry({ name: 'w-rule', category: 'aws' }),
    ]);

    expect(groups.map((group) => group.category)).toEqual([
      'aws',
      'azure',
      'gcp',
    ]);
  });
});

describe('renderRuleIndex', () => {
  it('opens with a generated-file header warning against hand edits', () => {
    const markdown = renderRuleIndex([entry()]);

    const firstLine = markdown.split('\n')[0] ?? '';
    expect(firstLine.toLowerCase()).toContain('do not edit');
    expect(firstLine).toContain('npm run docs:rules');
  });

  it('emits a heading per category group, in group order', () => {
    const markdown = renderRuleIndex([
      entry({ name: 'aws-rule', category: 'aws' }),
      entry({ name: 'core-rule', category: 'core' }),
    ]);

    expect(markdown).toContain('## core');
    expect(markdown).toContain('## aws');
    expect(markdown.indexOf('## core')).toBeLessThan(
      markdown.indexOf('## aws'),
    );
  });

  it('emits one table row per rule, linking the rule name to its page', () => {
    const markdown = renderRuleIndex([
      entry({ name: 'documented-variables' }),
      entry({ name: 'typed-variables' }),
    ]);

    expect(ruleRows(markdown)).toHaveLength(2);
    expect(markdown).toContain(
      '[`documented-variables`](./documented-variables.md)',
    );
    expect(markdown).toContain('[`typed-variables`](./typed-variables.md)');
  });

  it('emits the description, severity, and category in the row', () => {
    const markdown = renderRuleIndex([
      entry({
        name: 'no-splat-bracket-index',
        description: 'Index the collection first.',
        severity: 'warn',
        category: 'aws',
      }),
    ]);

    expect(ruleRows(markdown)[0]).toEqual([
      '[`no-splat-bracket-index`](./no-splat-bracket-index.md)',
      'Index the collection first.',
      'warn',
      'aws',
      CHECK_MARK,
      '',
    ]);
  });

  it('renders the recommended flag as a check mark, and empty when not recommended', () => {
    const markdown = renderRuleIndex([
      entry({ name: 'a-rule', recommended: true }),
      entry({ name: 'b-rule', recommended: false }),
    ]);

    const [recommendedRow, optOutRow] = ruleRows(markdown);
    expect(recommendedRow?.[4]).toBe(CHECK_MARK);
    expect(optOutRow?.[4]).toBe('');
  });

  it('renders the fixable flag as a check mark, and empty when not fixable', () => {
    const markdown = renderRuleIndex([
      entry({ name: 'a-rule', fixable: true }),
      entry({ name: 'b-rule', fixable: false }),
    ]);

    const [fixableRow, manualRow] = ruleRows(markdown);
    expect(fixableRow?.[5]).toBe(CHECK_MARK);
    expect(manualRow?.[5]).toBe('');
  });

  it('escapes a pipe inside a description so the row is not split', () => {
    const markdown = renderRuleIndex([
      entry({ description: 'Flag `a || b` in a condition.' }),
    ]);

    const [row] = ruleRows(markdown);
    expect(row).toHaveLength(6);
    expect(row?.[1]).toBe('Flag `a \\|\\| b` in a condition.');
  });

  it('is idempotent for the same input', () => {
    const entries = [
      entry({ name: 'core-rule' }),
      entry({ name: 'aws-rule', category: 'aws' }),
    ];

    expect(renderRuleIndex(entries)).toBe(renderRuleIndex(entries));
  });
});

describe('findRuleDocsParityProblems', () => {
  it('returns no problems when rule names and docs pages match exactly', () => {
    expect(
      findRuleDocsParityProblems(
        ['documented-variables', 'typed-variables'],
        ['typed-variables', 'documented-variables'],
      ),
    ).toEqual([]);
  });

  it('reports a rule with no docs page, naming the expected path', () => {
    const problems = findRuleDocsParityProblems(
      ['documented-variables', 'typed-variables'],
      ['documented-variables'],
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('typed-variables');
    expect(problems[0]).toContain('docs/rules/typed-variables.md');
  });

  it('reports a docs page with no matching rule, naming the file', () => {
    const problems = findRuleDocsParityProblems(
      ['documented-variables'],
      ['documented-variables', 'zzz-fake'],
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('docs/rules/zzz-fake.md');
  });

  it('reports both kinds together when both are present', () => {
    const problems = findRuleDocsParityProblems(
      ['typed-variables'],
      ['zzz-fake'],
    );

    expect(problems).toHaveLength(2);
    expect(problems.join('\n')).toContain('docs/rules/typed-variables.md');
    expect(problems.join('\n')).toContain('docs/rules/zzz-fake.md');
  });

  it('ignores index.md, which is generated and is not a rule page', () => {
    expect(
      findRuleDocsParityProblems(
        ['documented-variables'],
        ['documented-variables', 'index'],
      ),
    ).toEqual([]);
  });
});

describe('findRuleDocsHeadingProblems', () => {
  it('returns no problems when every page opens with its own name as the heading', () => {
    expect(
      findRuleDocsHeadingProblems([
        { name: 'documented-variables', firstLine: '# documented-variables' },
        { name: 'typed-variables', firstLine: '# typed-variables' },
      ]),
    ).toEqual([]);
  });

  it('reports a page whose heading disagrees with its filename, showing both', () => {
    const problems = findRuleDocsHeadingProblems([
      { name: 'typed-variables', firstLine: '# documented-variables' },
    ]);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('docs/rules/typed-variables.md');
    expect(problems[0]).toContain('# documented-variables');
    expect(problems[0]).toContain('# typed-variables');
  });
});

describe('buildRuleSidebar', () => {
  it('produces one group per category, in the same order as groupRulesByCategory', () => {
    const entries = [
      entry({ name: 'aws-rule', category: 'aws' }),
      entry({ name: 'core-rule', category: 'core' }),
    ];

    const groupTexts = buildRuleSidebar(entries)
      .filter((item) => 'items' in item)
      .map((group) => group.text);

    expect(groupTexts).toEqual(
      groupRulesByCategory(entries).map((group) => group.category),
    );
  });

  it('produces an item per rule, with the rule name as text and its page as link', () => {
    const sidebar = buildRuleSidebar([
      entry({ name: 'typed-variables' }),
      entry({ name: 'documented-variables' }),
    ]);

    const [group] = sidebar.filter((item) => 'items' in item);
    expect(group?.items).toEqual([
      { text: 'documented-variables', link: '/rules/documented-variables' },
      { text: 'typed-variables', link: '/rules/typed-variables' },
    ]);
  });

  it('links the rule index itself as the first sidebar entry', () => {
    const [first] = buildRuleSidebar([entry()]);

    expect(first).toEqual({ text: 'All rules', link: '/rules/' });
  });
});
