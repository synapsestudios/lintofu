import { Linter } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';
import plugin from './index.js';
import { initialize } from './parser/index.js';

beforeAll(async () => {
  await initialize();
});

interface LintOptions {
  rule?: string;
  reportUnused?: boolean;
  noInlineConfig?: boolean;
}

// RuleTester does not run ESLint's inline-directive layer, so directive
// suppression is exercised through a real Linter instead.
function config(opts: LintOptions = {}): Linter.Config {
  const rule = opts.rule ?? 'lintofu/documented-outputs';
  return {
    files: ['**/*.tf'],
    plugins: { lintofu: plugin },
    language: 'lintofu/opentofu',
    linterOptions: {
      reportUnusedDisableDirectives: opts.reportUnused ?? false,
      noInlineConfig: opts.noInlineConfig ?? false,
    },
    rules: { [rule]: 'error' },
  };
}

function lint(code: string, opts: LintOptions = {}): Linter.LintMessage[] {
  return new Linter().verify(code, config(opts), { filename: 'test.tf' });
}

function fix(code: string, opts: LintOptions = {}): string {
  const result = new Linter().verifyAndFix(code, config(opts), {
    filename: 'test.tf',
  });
  return result.output;
}

const UNDOCUMENTED_OUTPUT = 'output "arn" {\n  value = "x"\n}';

describe('inline disable directives', () => {
  it('reports the violation when no directive is present', () => {
    const messages = lint(UNDOCUMENTED_OUTPUT);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.messageId).toBe('missingDescription');
  });

  it('# eslint-disable-next-line suppresses the next line', () => {
    const messages = lint(
      `# eslint-disable-next-line lintofu/documented-outputs\n${UNDOCUMENTED_OUTPUT}`,
    );
    expect(messages).toEqual([]);
  });

  // terraform fmt rewrites // to #, so # is the form that survives
  // formatting; // is supported for parity.
  it('// eslint-disable-next-line suppresses the next line', () => {
    const messages = lint(
      `// eslint-disable-next-line lintofu/documented-outputs\n${UNDOCUMENTED_OUTPUT}`,
    );
    expect(messages).toEqual([]);
  });

  it('# eslint-disable-line suppresses its own line', () => {
    const messages = lint(
      'output "arn" { value = "x" } # eslint-disable-line lintofu/documented-outputs',
    );
    expect(messages).toEqual([]);
  });

  it('reports a problem for an eslint-disable-line that spans multiple lines', () => {
    const messages = lint(
      'output "arn" { value = "x" } /* eslint-disable-line lintofu/documented-outputs\n*/',
    );
    // No suppression applied, so the violation still reports, plus a
    // problem about the multi-line directive.
    const ruleIds = messages.map((m) => m.ruleId);
    expect(ruleIds).toContain('lintofu/documented-outputs');
    expect(ruleIds).toContain(null);
  });

  it('/* eslint-disable rule */ ... /* eslint-enable rule */ suppresses the region', () => {
    const messages = lint(
      `/* eslint-disable lintofu/documented-outputs */\n${UNDOCUMENTED_OUTPUT}\n/* eslint-enable lintofu/documented-outputs */`,
    );
    expect(messages).toEqual([]);
  });

  it('a bare /* eslint-disable */ suppresses all rules for the region', () => {
    const messages = lint(`/* eslint-disable */\n${UNDOCUMENTED_OUTPUT}`);
    expect(messages).toEqual([]);
  });

  it('reports an unused disable directive when reportUnusedDisableDirectives is on', () => {
    const messages = lint(
      '# eslint-disable-next-line lintofu/documented-outputs\nvariable "region" {}',
      { reportUnused: true },
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toMatch(/unused/i);
  });

  it('autofix removes only the directive comment without merging adjacent lines', () => {
    const output = fix(
      '# eslint-disable-next-line lintofu/documented-outputs\nvariable "region" {}',
      { reportUnused: true },
    );
    expect(output).not.toContain('eslint-disable');
    // The newline survives, so the variable is not pulled onto the comment line.
    expect(output).toContain('\nvariable "region" {}');
  });

  it('reports a directive comment under noInlineConfig', () => {
    const messages = lint(
      `# eslint-disable-next-line lintofu/documented-outputs\n${UNDOCUMENTED_OUTPUT}`,
      { noInlineConfig: true },
    );
    expect(messages.some((m) => m.message.includes('noInlineConfig'))).toBe(
      true,
    );
  });
});
