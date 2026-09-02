// @ts-check
import eslint from '@eslint/js';
import eslintPlugin from 'eslint-plugin-eslint-plugin';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import securityPlugin from 'eslint-plugin-security';
import tsdocPlugin from 'eslint-plugin-tsdoc';
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
        project: ['./tsconfig.test.json'],
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
    files: ['src/rules/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/rules/aws/**',
                '../aws/*',
                '../aws/**',
                '**/rules/cloudflare/**',
                '../cloudflare/*',
                '../cloudflare/**',
              ],
              message:
                'core rules must not import provider utilities; move a provider-agnostic helper to core/utils.ts instead',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/rules/aws/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/rules/cloudflare/**',
                '../cloudflare/*',
                '../cloudflare/**',
              ],
              message:
                'a provider module must not import another provider; move a shared helper to core/utils.ts instead',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/rules/cloudflare/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/rules/aws/**', '../aws/*', '../aws/**'],
              message:
                'a provider module must not import another provider; move a shared helper to core/utils.ts instead',
            },
          ],
        },
      ],
    },
  },

  {
    files: [
      'src/index.ts',
      'src/types.ts',
      'src/language.ts',
      'src/rules/types.ts',
      'src/parser/types.ts',
      'src/source-code.ts',
      'src/project-index.ts',
    ],
    plugins: { jsdoc: jsdocPlugin, tsdoc: tsdocPlugin },
    rules: {
      'tsdoc/syntax': 'error',
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: {
            ClassDeclaration: true,
            FunctionDeclaration: true,
            MethodDefinition: true,
          },
          contexts: ['TSInterfaceDeclaration', 'TSTypeAliasDeclaration'],
          exemptEmptyConstructors: true,
        },
      ],
    },
  },

  {
    files: ['**/*.test.ts', '**/*.test-d.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
);
