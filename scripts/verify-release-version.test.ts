import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const script = fileURLToPath(
  new URL('./verify-release-version.sh', import.meta.url),
);

function run(tag: string, version: string): { status: number; output: string } {
  try {
    const output = execFileSync('bash', [script, tag, version], {
      encoding: 'utf8',
    });
    return { status: 0, output };
  } catch (error) {
    const e = error as { status: number; stdout: string; stderr: string };
    return { status: e.status, output: e.stdout + e.stderr };
  }
}

describe('verify-release-version', () => {
  it('passes when the tag matches the package version', () => {
    expect(run('v0.1.0', '0.1.0').status).toBe(0);
  });

  it('fails and reports both values when the tag does not match', () => {
    const result = run('v0.2.0', '0.1.0');
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('v0.2.0');
    expect(result.output).toContain('0.1.0');
  });

  it('passes when the tag has no leading v', () => {
    expect(run('0.1.0', '0.1.0').status).toBe(0);
  });
});
