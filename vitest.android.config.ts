import { defineConfig } from 'vitest/config';

import { samoCoreAliases } from './vite.samo-core-aliases';

// Runs the pure Android reducer/logic tests under the same @samo/core aliases
// as the core suite. Reached via `pnpm -C apps/android run test`, which the
// `android` job in .github/workflows/test.yml runs on every push and PR.
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
