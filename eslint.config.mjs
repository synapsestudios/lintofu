// @ts-check
import eslint from '@eslint/js';
import eslintPlugin from 'eslint-plugin-eslint-plugin';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import securityPlugin from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '**/*.d.ts',
      'coverage/**',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
      'vitest.config.ts',
    ],
  },

  eslint.configs.recommended,

  {
    files: ['**/*.ts'],
    extends: [
      ...tseslint.configs.strict,
      ...tseslint.configs.stylistic,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  eslintPluginPrettierRecommended,

  {
    plugins: { security: securityPlugin },
    rules: {
      ...securityPlugin.configs.recommended.rules,
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-regexp': 'off',
      'security/detect-non-literal-fs-filename': 'off',
    },
  },

  {
    files: ['src/rules/**/*.ts'],
    ignores: ['src/rules/**/*.test.ts'],
    plugins: { 'eslint-plugin': eslintPlugin },
    rules: {
      ...eslintPlugin.configs.recommended.rules,
    },
  },

  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
);
