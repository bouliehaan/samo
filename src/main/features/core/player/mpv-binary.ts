import { app } from 'electron';
import { accessSync, chmodSync, constants, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { store } from '../settings';

import { createLog, isLinux, isMacOS } from '/@/main/utils';

type MpvLogger = (data: { action: string; type?: 'debug' | 'info' | 'warning' }) => void;

const defaultLogger: MpvLogger = ({ action, type = 'info' }) => {
    createLog({ message: `[AUDIO PLAYER] ${action}`, type });
};

type MpvBinaryCandidate = {
    allowExecutableName?: boolean;
    canRepairPermissions?: boolean;
    path: string;
    source: string;
};

const MACOS_DEV_MPV_CANDIDATES = ['/opt/homebrew/bin/mpv', '/usr/local/bin/mpv'];
const LINUX_MPV_CANDIDATES = ['/usr/bin/mpv', '/usr/local/bin/mpv', '/snap/bin/mpv'];

const getConfiguredMpvBinaryPath = () => store.get('mpv_path') as string | undefined;

const getBundledMacOSMpvBinaryPath = () => join(process.resourcesPath, 'bin', 'mpv');
const getBundledMacOSX64MpvBinaryPath = () => join(process.resourcesPath, 'bin', 'x64', 'mpv');

const getPackagedMacOSMpvCandidates = (): MpvBinaryCandidate[] => {
    const appleSiliconMpv = {
        canRepairPermissions: true,
        path: getBundledMacOSMpvBinaryPath(),
        source: 'bundled Apple Silicon app resource',
    };
    const intelMpv = {
        canRepairPermissions: true,
        path: getBundledMacOSX64MpvBinaryPath(),
        source: 'bundled Intel app resource',
    };

    return process.arch === 'x64' ? [intelMpv, appleSiliconMpv] : [appleSiliconMpv, intelMpv];
};

const isExecutableName = (value: string) => !/[\\/]/.test(value);

const ensureMpvCandidateExecutable = (
    { canRepairPermissions, path: candidatePath, source }: MpvBinaryCandidate,
    log: MpvLogger,
) => {
    const stats = statSync(candidatePath);

    if (!stats.isFile()) {
        throw new Error(
            `MPV unavailable: ${source} exists at ${candidatePath}, but it is not a file.`,
        );
    }

    try {
        accessSync(candidatePath, constants.X_OK);
        return;
    } catch {
        if (canRepairPermissions) {
            try {
                chmodSync(candidatePath, stats.mode | 0o111);
                accessSync(candidatePath, constants.X_OK);
                log({
                    action: `Repaired executable permissions for ${source} MPV at ${candidatePath}`,
                    type: 'warning',
                });
                return;
            } catch {
                // Fall through to the explicit error below.
            }
        }

        throw new Error(
            `MPV unavailable: ${source} exists at ${candidatePath}, but it is not executable.`,
        );
    }
};

const resolveExistingMpvCandidate = (candidate: MpvBinaryCandidate, log: MpvLogger) => {
    if (candidate.allowExecutableName && isExecutableName(candidate.path)) {
        return candidate.path;
    }

    if (!existsSync(candidate.path)) {
        return null;
    }

    ensureMpvCandidateExecutable(candidate, log);
    return candidate.path;
};

const logSelectedMpvPath = (
    log: MpvLogger,
    mode: 'dev' | 'packaged',
    path: string,
    source: string,
) => {
    log({ action: `Resolved MPV binary in ${mode} mode from ${source}: ${path}`, type: 'info' });
};

export const resolveMpvBinaryPath = (
    binaryPath?: string,
    log: MpvLogger = defaultLogger,
): string | undefined => {
    const mode = app.isPackaged ? 'packaged' : 'dev';
    const configuredPath = binaryPath || getConfiguredMpvBinaryPath();
    const envPath = process.env.SAMO_MPV_PATH;

    log({ action: `Resolving MPV binary in ${mode} mode`, type: 'debug' });

    if (isMacOS() && app.isPackaged) {
        const bundledCandidates = getPackagedMacOSMpvCandidates();

        for (const candidate of bundledCandidates) {
            const bundledMpvPath = resolveExistingMpvCandidate(candidate, log);

            if (bundledMpvPath) {
                logSelectedMpvPath(log, mode, bundledMpvPath, candidate.source);
                return bundledMpvPath;
            }
        }

        log({
            action: `Bundled MPV binaries missing at ${bundledCandidates
                .map((candidate) => candidate.path)
                .join(' and ')}`,
            type: 'warning',
        });

        if (configuredPath) {
            const configuredMpvPath = resolveExistingMpvCandidate(
                { path: configuredPath, source: 'configured mpv_path' },
                log,
            );

            if (configuredMpvPath) {
                logSelectedMpvPath(log, mode, configuredMpvPath, 'configured mpv_path');
                return configuredMpvPath;
            }

            log({
                action: `Configured MPV path was not found at ${configuredPath}`,
                type: 'warning',
            });
        }

        throw new Error(
            `MPV unavailable: packaged macOS builds require bundled MPV at ${getBundledMacOSMpvBinaryPath()} with optional Intel backup at ${getBundledMacOSX64MpvBinaryPath()}. Populate resources/bin/darwin before building release artifacts.`,
        );
    }

    if (isMacOS()) {
        const candidates: MpvBinaryCandidate[] = [
            ...(envPath ? [{ path: envPath, source: 'SAMO_MPV_PATH' }] : []),
            ...(configuredPath ? [{ path: configuredPath, source: 'configured mpv_path' }] : []),
            ...MACOS_DEV_MPV_CANDIDATES.map((path) => ({
                path,
                source: 'macOS development default path',
            })),
        ];

        for (const candidate of candidates) {
            const resolvedPath = resolveExistingMpvCandidate(candidate, log);

            if (resolvedPath) {
                logSelectedMpvPath(log, mode, resolvedPath, candidate.source);
                return resolvedPath;
            }
        }

        throw new Error(
            `MPV unavailable: set SAMO_MPV_PATH, configure mpv_path, or install mpv at ${MACOS_DEV_MPV_CANDIDATES.join(
                ' or ',
            )}.`,
        );
    }

    const candidates: MpvBinaryCandidate[] = [
        ...(envPath ? [{ allowExecutableName: true, path: envPath, source: 'SAMO_MPV_PATH' }] : []),
        ...(configuredPath
            ? [{ allowExecutableName: true, path: configuredPath, source: 'configured mpv_path' }]
            : []),
        ...(isLinux()
            ? LINUX_MPV_CANDIDATES.map((path) => ({
                  path,
                  source: 'linux default path',
              }))
            : []),
    ];

    for (const candidate of candidates) {
        const resolvedPath = resolveExistingMpvCandidate(candidate, log);

        if (resolvedPath) {
            logSelectedMpvPath(log, mode, resolvedPath, candidate.source);
            return resolvedPath;
        }
    }

    log({
        action: 'No explicit MPV binary resolved; allowing node-mpv to use system PATH',
        type: 'warning',
    });
    return undefined;
};
