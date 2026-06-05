import { defineConfig } from 'vitest/config';

import { samoCoreAliases } from './vite.samo-core-aliases';

// Throwaway config so the pure Android reducer tests can run under the same
// @samo/core aliases as the core suite. Not wired into CI; used for local
// regression runs of apps/android pure-logic tests.
export default defineConfig({
    resolve: {
        alias: [...samoCoreAliases],
    },
    test: {
        environment: 'node',
        include: ['apps/android/src/**/*.test.ts'],
        server: {
            deps: {
                inline: ['@samo/core', /@samo\/core\/.*/],
            },
        },
    },
});
