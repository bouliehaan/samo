import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier';
import tseslint from '@electron-toolkit/eslint-config-ts';
import perfectionist from 'eslint-plugin-perfectionist';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
    {
        ignores: [
            '**/node_modules',
            '**/dist',
            '**/out',
            'packages/core/src/**/*.js',
            'packages/core/src/**/*.d.ts',
        ],
    },
    tseslint.configs.recommended,
    perfectionist.configs['recommended-natural'],
    eslintPluginReact.configs.flat.recommended,
    eslintPluginReact.configs.flat['jsx-runtime'],
    {
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        files: ['src/renderer/**/*.{ts,tsx}'],
        rules: {
            'no-console': 'error',
        },
    },
    {
        files: [
            'src/renderer/utils/logger.ts',
            'src/renderer/**/*error-boundary*.{ts,tsx}',
            'src/renderer/**/router-error-boundary.tsx',
        ],
        rules: {
            'no-console': 'off',
        },
    },
    {
        files: ['**/*.{ts,tsx}'],
        plugins: {
            'react-hooks': eslintPluginReactHooks,
            'react-refresh': eslintPluginReactRefresh,
        },
        rules: {
            ...eslintPluginReactHooks.configs['recommended-latest'].rules,
            ...eslintPluginReactRefresh.configs.vite.rules,
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-duplicate-enum-values': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'warn',
            curly: ['error', 'all'],
            indent: [
                'error',
                'tab',
                {
                    offsetTernaryExpressions: true,
                    SwitchCase: 1,
                },
            ],
            'no-unused-vars': 'off',
            'no-use-before-define': 'off',
            quotes: ['error', 'single'],
            'react-hooks/refs': 'off',
            'react-hooks/set-state-in-effect': 'off',
            'react-refresh/only-export-components': 'off',
            'react/display-name': 'off',
            semi: ['error', 'always'],
            'single-attribute-per-line': 'off',
        },
    },
    eslintConfigPrettier,
    {
        files: ['apps/android/src/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            curly: 'off',
            indent: 'off',
            'no-console': 'error',
            'perfectionist/sort-classes': 'off',
            'perfectionist/sort-imports': 'off',
            'perfectionist/sort-interfaces': 'off',
            'perfectionist/sort-jsx-props': 'off',
            'perfectionist/sort-modules': 'off',
            'perfectionist/sort-named-imports': 'off',
            'perfectionist/sort-object-types': 'off',
            'perfectionist/sort-objects': 'off',
            'perfectionist/sort-switch-case': 'off',
            'perfectionist/sort-union-types': 'off',
            'prettier/prettier': 'off',
            quotes: 'off',
            'react-hooks/exhaustive-deps': 'off',
            'react-hooks/immutability': 'off',
            'react-hooks/preserve-manual-memoization': 'off',
            'react/prop-types': 'off',
            semi: 'off',
        },
    },
    {
        files: ['apps/android/src/utils/log.ts', 'apps/android/src/components/ErrorBoundary.tsx'],
        rules: {
            'no-console': 'off',
        },
    },
    {
        files: ['packages/core/src/**/*.ts'],
        ignores: ['**/*.test.ts'],
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            curly: 'off',
            indent: 'off',
            'no-console': 'error',
            'perfectionist/sort-imports': 'off',
            'perfectionist/sort-interfaces': 'off',
            'perfectionist/sort-modules': 'off',
            'perfectionist/sort-named-imports': 'off',
            'perfectionist/sort-object-types': 'off',
            'perfectionist/sort-objects': 'off',
            'perfectionist/sort-union-types': 'off',
            'prettier/prettier': 'off',
            quotes: 'off',
            semi: 'off',
        },
    },
);
