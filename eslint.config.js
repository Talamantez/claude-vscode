// eslint.config.js
import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
    {
        ignores: [
            'out/**',
            'dist/**',
            'node_modules/**',
            '.vscode-test/**',
            'examples/**',
            'deno/**'
        ]
    },
    {
        files: ['src/**/*.ts', 'test/**/*.ts'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
                project: ['./tsconfig.json', './tsconfig.test.json']
            },
            globals: {
                ...globals.node,
                ...globals.mocha
            }
        },
        plugins: {
            '@typescript-eslint': tseslint
        },
        rules: {
            ...eslint.configs.recommended.rules,
            ...tseslint.configs.recommended.rules,
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'default',
                    format: ['camelCase']
                },
                {
                    selector: 'variable',
                    format: ['camelCase', 'UPPER_CASE']
                },
                {
                    selector: 'parameter',
                    format: ['camelCase'],
                    leadingUnderscore: 'allow'
                },
                {
                    selector: 'memberLike',
                    modifiers: ['private'],
                    format: ['camelCase'],
                    leadingUnderscore: 'require'
                },
                {
                    selector: 'typeLike',
                    format: ['PascalCase']
                }
            ],
            '@typescript-eslint/semi': 'warn',
            'curly': 'warn',
            'eqeqeq': 'warn',
            'no-throw-literal': 'warn',
            'semi': 'off'
        }
    }
];