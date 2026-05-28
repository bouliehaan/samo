import { externalizeDepsPlugin, UserConfig } from 'electron-vite';
import { resolve } from 'path';
import conditionalImportPlugin from 'vite-plugin-conditional-import';
import dynamicImportPlugin from 'vite-plugin-dynamic-import';
import { ViteEjsPlugin } from 'vite-plugin-ejs';

import { createReactPlugin } from './vite.react-plugin';
import { samoCoreAliases } from './vite.samo-core-aliases';

const currentOSEnv = process.platform;
const electronRendererTarget = 'chrome87';

const config: UserConfig = {
    main: {
        build: {
            rollupOptions: {
                external: ['source-map-support'],
            },
            sourcemap: true,
        },
        define: {
            'import.meta.env.IS_LINUX': JSON.stringify(currentOSEnv === 'linux'),
            'import.meta.env.IS_MACOS': JSON.stringify(currentOSEnv === 'darwin'),
            'import.meta.env.IS_WIN': JSON.stringify(currentOSEnv === 'win32'),
        },
        plugins: [
            externalizeDepsPlugin(),
            dynamicImportPlugin(),
            conditionalImportPlugin({
                currentEnv: currentOSEnv,
                envs: ['win32', 'linux', 'darwin'],
            }),
        ],
        resolve: {
            alias: [
                ...samoCoreAliases,
                { find: '/@/main', replacement: resolve('src/main') },
                { find: '/@/shared', replacement: resolve('src/shared') },
            ],
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
        },
    },
    preload: {
        build: {
            sourcemap: true,
        },
        plugins: [externalizeDepsPlugin()],
        resolve: {
            alias: [
                ...samoCoreAliases,
                { find: '/@/preload', replacement: resolve('src/preload') },
                { find: '/@/shared', replacement: resolve('src/shared') },
            ],
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
        },
    },
    renderer: {
        build: {
            cssMinify: 'esbuild',
            minify: 'esbuild',
            modulePreload: {
                polyfill: false,
            },
            sourcemap: true,
            target: electronRendererTarget,
        },
        css: {
            modules: {
                generateScopedName: 'fs-[name]-[local]',
                localsConvention: 'camelCase',
            },
        },
        plugins: [createReactPlugin(), ViteEjsPlugin({ web: false })],
        resolve: {
            alias: [
                ...samoCoreAliases,
                { find: '/@/i18n', replacement: resolve('src/i18n') },
                { find: '/@/remote', replacement: resolve('src/remote') },
                { find: '/@/renderer', replacement: resolve('src/renderer') },
                { find: '/@/shared', replacement: resolve('src/shared') },
            ],
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
        },
    },
};

export default config;
