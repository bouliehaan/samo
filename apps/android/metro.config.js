/* eslint-disable @typescript-eslint/no-require-imports, perfectionist/sort-imports */

const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
];

// Force every `react` import to resolve to ONE physical path. In a pnpm
// workspace, react-native ships its own nested node_modules/react and the
// hoisted root has another copy — even when versions match, two paths means
// two dispatcher instances and hooks blow up with "useState of null".
// `extraNodeModules` is only a fallback and doesn't help here because walk-up
// succeeds before the alias fires; `resolveRequest` intercepts unconditionally.
const REACT_ROOT = path.resolve(projectRoot, 'node_modules/react');
const REACT_ALIASES = {
    react: path.join(REACT_ROOT, 'index.js'),
    'react/jsx-runtime': path.join(REACT_ROOT, 'jsx-runtime.js'),
    'react/jsx-dev-runtime': path.join(REACT_ROOT, 'jsx-dev-runtime.js'),
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    const aliased = REACT_ALIASES[moduleName];
    if (aliased) {
        return { type: 'sourceFile', filePath: aliased };
    }
    if (defaultResolveRequest) {
        return defaultResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

// Bump whenever resolver config changes so Metro discards its stale cache.
// 2026-05-16: bumped after removing the manual worklets/plugin from
// babel.config.js — Metro's previous bundles were transformed twice and need
// to be invalidated.
config.cacheVersion = 'single-react-v7-worklets-fix';

module.exports = config;
