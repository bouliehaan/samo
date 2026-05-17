/* eslint-disable @typescript-eslint/no-require-imports, perfectionist/sort-imports */

const path = require('path');
const fs = require('fs');
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

// pnpm + workspaces leaves two physical copies of several packages around:
// the canonical one under apps/android/node_modules/.pnpm/<pkg>@.../node_modules/<pkg>/
// (which is what the gradle build links against) and a stray hoisted copy at
// /workspace-root/node_modules/<pkg>/. When Metro bundles, different importers
// resolve to different copies — the renderers + InitializeCore end up bundled
// twice, and the second pass through setUpFuseboxReactDevToolsDispatcher fails
// with "TypeError: property is not writable" trying to redefine the
// non-writable __FUSEBOX_REACT_DEVTOOLS_DISPATCHER__ global.
//
// Detect any resolution that lands inside /workspace-root/node_modules/<pkg>/
// and redirect to its apps/android-local equivalent, keeping all file paths
// consistent with the native build. Skip /workspace-root/node_modules/.pnpm/
// itself so workspace-only deps (eg the Electron app) still resolve correctly.
const WORKSPACE_NM = path.resolve(workspaceRoot, 'node_modules');
const PROJECT_NM = path.resolve(projectRoot, 'node_modules');
const WORKSPACE_NM_PREFIX = `${WORKSPACE_NM}${path.sep}`;
const WORKSPACE_PNPM_PREFIX = `${WORKSPACE_NM}${path.sep}.pnpm${path.sep}`;
const projectPkgRealpathCache = new Map();
const getProjectPkgRealpath = (pkgName) => {
    if (projectPkgRealpathCache.has(pkgName)) {
        return projectPkgRealpathCache.get(pkgName);
    }
    const projectPkgPath = path.join(PROJECT_NM, pkgName);
    let resolved = null;
    try {
        resolved = fs.realpathSync(projectPkgPath);
    } catch {
        resolved = null;
    }
    projectPkgRealpathCache.set(pkgName, resolved);
    return resolved;
};
const dedupeWorkspaceRootCopy = (filePath) => {
    if (!filePath || !filePath.startsWith(WORKSPACE_NM_PREFIX)) return filePath;
    if (filePath.startsWith(WORKSPACE_PNPM_PREFIX)) return filePath;
    if (filePath.startsWith(`${PROJECT_NM}${path.sep}`)) return filePath;

    const tail = filePath.substring(WORKSPACE_NM_PREFIX.length);
    const parts = tail.split(path.sep);
    if (parts.length === 0) return filePath;
    const pkgName = parts[0].startsWith('@')
        ? `${parts[0]}/${parts[1] ?? ''}`
        : parts[0];
    if (!pkgName || pkgName.endsWith('/')) return filePath;

    const realProjectPkg = getProjectPkgRealpath(pkgName);
    if (!realProjectPkg) return filePath;

    const subParts = pkgName.startsWith('@') ? parts.slice(2) : parts.slice(1);
    const redirected = path.join(realProjectPkg, ...subParts);
    return fs.existsSync(redirected) ? redirected : filePath;
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    const aliased = REACT_ALIASES[moduleName];
    if (aliased) {
        return { type: 'sourceFile', filePath: aliased };
    }
    const result = defaultResolveRequest
        ? defaultResolveRequest(context, moduleName, platform)
        : context.resolveRequest(context, moduleName, platform);
    if (result && result.type === 'sourceFile' && result.filePath) {
        const deduped = dedupeWorkspaceRootCopy(result.filePath);
        if (deduped !== result.filePath) {
            return { ...result, filePath: deduped };
        }
    }
    return result;
};

// Bump whenever resolver config changes so Metro discards its stale cache.
// 2026-05-16: bumped a second time after adding the workspace-root dedupe
// hook above — the bundle's module identity is keyed by filePath, so the
// dedupe materially changes module assignments.
config.cacheVersion = 'single-react-v8-dedupe';

module.exports = config;
