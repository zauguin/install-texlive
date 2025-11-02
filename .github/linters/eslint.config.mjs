import stylistic from '@stylistic/eslint-plugin'
import ts from 'typescript-eslint'
import github from 'eslint-plugin-github'
import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    ignores: ['**/dist/', '**/coverage/', '**/*.json', '.*/']
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  github.getFlatConfigs().recommended,
  {
    plugins: {
      '@typescript-eslint': ts.plugin,
      '@stylistic': stylistic
    },

    languageOptions: {
      globals: {
        ...globals.node,
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly'
      },

      parser: ts.parser,
      ecmaVersion: 2023,
      sourceType: 'module',

      parserOptions: {
        project: ['./tsconfig.json']
      }
    },

    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts']
      },

      'import/resolver': {
        typescript: {
          alwaysTryTypes: true
        }
      }
    },

    rules: {
      camelcase: 'off',
      'eslint-comments/no-use': 'off',
      'eslint-comments/no-unused-disable': 'off',
      'i18n-text/no-en': 'off',
      'import/no-namespace': 'off',
      'no-console': 'off',
      'no-unused-vars': 'off',
      'prettier/prettier': 'error',
      '@stylistic/semi': 'off',
      '@typescript-eslint/array-type': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/consistent-type-assertions': 'error',

      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'no-public'
        }
      ],

      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true
        }
      ],

      '@typescript-eslint/no-array-constructor': 'error',
      '@typescript-eslint/no-empty-interface': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-extraneous-class': 'error',
      '@typescript-eslint/no-for-in-array': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-misused-new': 'error',
      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-unnecessary-qualifier': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ],

      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/prefer-function-type': 'warn',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/restrict-plus-operands': 'error',
      '@typescript-eslint/space-before-function-paren': 'off',
      '@stylistic/type-annotation-spacing': 'error',
      '@typescript-eslint/unbound-method': 'error'
    }
  }
]
