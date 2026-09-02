import { describe, expect, it } from 'vitest';
import plugin from '../index.js';

describe('plugin.configs', () => {
  it('exposes recommended plus one <provider>/recommended config per provider', () => {
    expect(Object.keys(plugin.configs)).toEqual([
      'recommended',
      'aws/recommended',
      'cloudflare/recommended',
    ]);
  });

  it('gives every config the same file coverage, language, and plugin registration', () => {
    for (const config of Object.values(plugin.configs)) {
      expect(config.files).toEqual(['**/*.tf', '**/*.tofu']);
      expect(config.language).toBe('lintofu/opentofu');
      expect(config.plugins).toEqual({ lintofu: plugin });
    }
  });
});
