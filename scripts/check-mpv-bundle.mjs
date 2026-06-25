#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { accessSync, constants, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const bundles = [
    {
        arch: 'arm64',
        executableDir: resolve('resources/bin/darwin'),
        label: 'Apple Silicon primary',
        mpvPath: resolve('resources/bin/darwin/mpv'),
    },
    {
        arch: 'x86_64',
        executableDir: resolve('resources/bin/darwin/x64'),
        label: 'Intel backup',
        mpvPath: resolve('resources/bin/darwin/x64/mpv'),
    },
];

const fail = (message) => {
    console.error(`[MPV BUNDLE] ${message}`);
    process.exit(1);
};

const walkFiles = (directory) => {
    const entries = readdirSync(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const path = join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...walkFiles(path));
        } else if (entry.isFile()) {
            files.push(path);
        }
    }

    return files;
};

const checkExecutable = ({ label, mpvPath }) => {
    if (!existsSync(mpvPath)) {
        fail(`Missing ${mpvPath}. Populate resources/bin/darwin before mac release builds.`);
    }

    const stats = statSync(mpvPath);

    if (!stats.isFile()) {
        fail(`${mpvPath} exists but is not a file.`);
    }

    try {
        accessSync(mpvPath, constants.X_OK);
    } catch {
        fail(`${mpvPath} exists but is not executable. Run chmod 755 ${mpvPath}.`);
    }

    const libDir = join(dirname(mpvPath), 'lib');

    if (!existsSync(libDir) || !statSync(libDir).isDirectory()) {
        fail(`${label} is missing its sibling lib directory at ${libDir}.`);
    }
};

const getOtoolLibraries = (file) => {
    try {
        const output = execFileSync('otool', ['-L', file], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });

        return output
            .split('\n')
            .slice(1)
            .map((line) => line.trim().split(/\s+/)[0])
            .filter(Boolean);
    } catch {
        return null;
    }
};

const checkLinkedLibrary = ({ executableDir, file, library }) => {
    if (library.startsWith('/opt/homebrew/') || library.startsWith('/usr/local/')) {
        fail(
            `${file} links to a machine-local library: ${library}. Use a portable/self-contained MPV build instead of copying a Homebrew binary.`,
        );
    }

    if (library.startsWith('@rpath/')) {
        fail(
            `${file} links through ${library}. Use a build with explicit @executable_path or system-library install names so packaging cannot resolve through local Homebrew rpaths.`,
        );
    }

    if (library.startsWith('@executable_path/')) {
        const bundledPath = join(executableDir, library.replace('@executable_path/', ''));

        if (!existsSync(bundledPath)) {
            fail(`${file} expects bundled library ${library}, but ${bundledPath} is missing.`);
        }
    }

    if (library.startsWith('@loader_path/')) {
        const bundledPath = join(dirname(file), library.replace('@loader_path/', ''));

        if (!existsSync(bundledPath)) {
            fail(`${file} expects bundled library ${library}, but ${bundledPath} is missing.`);
        }
    }
};

const checkMachO = (bundle) => {
    let fileOutput = '';

    try {
        fileOutput = execFileSync('file', [bundle.mpvPath], {
            encoding: 'utf8',
        });
    } catch (error) {
        fail(`Could not inspect MPV architecture with file: ${error.message}`);
    }

    if (!fileOutput.includes(bundle.arch)) {
        fail(`${bundle.label} should be ${bundle.arch}, but file reported: ${fileOutput.trim()}`);
    }

    const files = [bundle.mpvPath, ...walkFiles(join(bundle.executableDir, 'lib'))];

    for (const file of files) {
        const linkedLibraries = getOtoolLibraries(file);

        if (!linkedLibraries) {
            continue;
        }

        for (const library of linkedLibraries) {
            checkLinkedLibrary({ executableDir: bundle.executableDir, file, library });
        }
    }
};

for (const bundle of bundles) {
    checkExecutable(bundle);

    if (process.platform === 'darwin') {
        checkMachO(bundle);
    }
}

if (process.platform !== 'darwin') {
    console.warn('[MPV BUNDLE] Skipping Mach-O linkage inspection because this is not macOS.');
}

console.log(
    `[MPV BUNDLE] ${bundles
        .map((bundle) => bundle.mpvPath)
        .join(' and ')} are present, executable, and passed portability checks.`,
);
