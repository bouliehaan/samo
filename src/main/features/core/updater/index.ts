import type { UpdateCheckResult } from 'electron-updater';

import log from 'electron-log/main';
import { AppImageUpdater, autoUpdater, MacUpdater, NsisUpdater } from 'electron-updater';
import semver from 'semver';

import packageJson from '../../../../../package.json';
import { autoUpdaterLogInterface, isLinux, isMacOS } from '../../../utils';
import { store } from '../settings';

const ALPHA_UPDATER_CONFIG: {
    bucket: string;
    channel: string;
    endpoint: string;
    provider: 's3';
} = {
    bucket: '',
    channel: 'alpha',
    endpoint: 'https://samo-nightly-bucket.bouliehaan.org',
    provider: 's3',
};

const GITHUB_UPDATER_CONFIG = {
    owner: 'bouliehaan',
    provider: 'github' as const,
    repo: 'samo',
};

export type ChannelName = 'alpha' | 'beta' | 'latest';
export type UpdaterInstance = AppImageUpdater | MacUpdater | NsisUpdater | typeof autoUpdater;

export class AppUpdater {
    constructor(getMainWindow: () => Electron.BrowserWindow | null) {
        const effectiveChannel = store.get('release_channel') as string;
        console.log('Effective update channel:', effectiveChannel);
        if (effectiveChannel === 'alpha') {
            checkAllChannelsAndGetBest().then(({ result, updater: updaterInstance }) => {
                updaterInstance.autoInstallOnAppQuit = true;
                updaterInstance.autoRunAppAfterInstall = true;
                if (isMacOS()) {
                    if (result?.isUpdateAvailable) {
                        getMainWindow()?.webContents.send(
                            'update-available',
                            result.updateInfo.version,
                        );
                    }
                } else {
                    updaterInstance.checkForUpdatesAndNotify();
                }
            });
            return;
        }

        configureAndGetUpdater();
        if (isMacOS()) {
            autoUpdater.autoDownload = false;
            autoUpdater
                .checkForUpdates()
                .then((result) => {
                    if (result?.isUpdateAvailable) {
                        getMainWindow()?.webContents.send(
                            'update-available',
                            result.updateInfo.version,
                        );
                    }
                })
                .catch((err) => console.error('Check for updates failed', err));
        } else {
            autoUpdater.checkForUpdatesAndNotify();
        }
    }
}

// When release channel is alpha, check alpha and latest for updates and return
// the updater + result for the newest version found (so alpha users can receive
// latest updates when they are newer than the current alpha).
export async function checkAllChannelsAndGetBest(): Promise<{
    result: null | UpdateCheckResult;
    updater: UpdaterInstance;
}> {
    const currentVersion = packageJson.version;
    const candidates: Array<{
        channel: 'alpha' | 'beta' | 'latest';
        result: UpdateCheckResult;
        updater: UpdaterInstance;
    }> = [];

    const alphaUpdater = createAlphaUpdaterInstance();
    alphaUpdater.logger = autoUpdaterLogInterface;
    alphaUpdater.channel = ALPHA_UPDATER_CONFIG.channel;
    alphaUpdater.allowPrerelease = true;
    alphaUpdater.disableDifferentialDownload = true;
    alphaUpdater.allowDowngrade = true;

    try {
        console.log('Checking for updates on alpha channel');
        const alphaResult = await alphaUpdater.checkForUpdates();
        if (
            alphaResult?.updateInfo?.version &&
            alphaResult.isUpdateAvailable &&
            semver.valid(alphaResult.updateInfo.version) &&
            semver.gt(alphaResult.updateInfo.version, currentVersion)
        ) {
            candidates.push({ channel: 'alpha', result: alphaResult, updater: alphaUpdater });
        }
    } catch (e) {
        log.warn('Alpha channel check failed', e);
    }

    try {
        autoUpdater.setFeedURL(GITHUB_UPDATER_CONFIG);
        configureAutoUpdaterForChannel('latest');
        console.log('Checking for updates on latest channel (GitHub)');
        const latestResult = await autoUpdater.checkForUpdates();
        if (
            latestResult?.updateInfo?.version &&
            latestResult.isUpdateAvailable &&
            semver.valid(latestResult.updateInfo.version) &&
            semver.gt(latestResult.updateInfo.version, currentVersion)
        ) {
            candidates.push({ channel: 'latest', result: latestResult, updater: autoUpdater });
        }
    } catch (e) {
        log.warn('Latest channel check failed', e);
    }

    if (candidates.length === 0) {
        return { result: null, updater: alphaUpdater };
    }

    const best = candidates.reduce((a, b) =>
        semver.gt(a.result.updateInfo.version, b.result.updateInfo.version) ? a : b,
    );

    if (best.channel === 'latest') {
        configureAutoUpdaterForChannel('latest');
    }

    return { result: best.result, updater: best.updater };
}

export function configureAndGetUpdater(): UpdaterInstance {
    const isBetaVersion = packageJson.version.includes('-beta');
    const isAlphaVersion = packageJson.version.includes('-alpha');
    let releaseChannel = store.get('release_channel');
    const isNotConfigured = !releaseChannel;

    console.log('Release channel:', releaseChannel);
    console.log('Is beta version:', isBetaVersion);
    console.log('Is alpha version:', isAlphaVersion);
    console.log('Is not configured:', isNotConfigured);

    if (isNotConfigured) {
        console.log('Release channel not configured, setting default channel');
        const defaultChannel: ChannelName = isAlphaVersion
            ? 'alpha'
            : isBetaVersion
              ? 'beta'
              : 'latest';
        store.set('release_channel', defaultChannel);
        releaseChannel = defaultChannel;
    }

    const effectiveChannel = store.get('release_channel') as ChannelName;

    if (effectiveChannel === 'alpha') {
        const updater = createAlphaUpdaterInstance();
        applyChannelConfig(updater, 'alpha');
        return updater;
    }

    applyChannelConfig(autoUpdater, effectiveChannel);
    return autoUpdater;
}

function applyChannelConfig(updater: UpdaterInstance, channel: ChannelName): void {
    log.transports.file.level = 'info';
    updater.logger = autoUpdaterLogInterface;
    updater.autoInstallOnAppQuit = true;
    updater.autoRunAppAfterInstall = true;

    switch (channel) {
        case 'alpha':
            updater.channel = ALPHA_UPDATER_CONFIG.channel;
            updater.allowPrerelease = true;
            updater.allowDowngrade = true;
            updater.disableDifferentialDownload = true;
            break;
        case 'beta':
            updater.channel = 'beta';
            updater.allowPrerelease = true;
            updater.allowDowngrade = true;
            updater.disableDifferentialDownload = true;
            break;
        case 'latest':
            updater.channel = 'latest';
            updater.allowPrerelease = false;
            break;
    }
}

function configureAutoUpdaterForChannel(channel: 'beta' | 'latest'): void {
    applyChannelConfig(autoUpdater, channel);
}

function createAlphaUpdaterInstance(): AppImageUpdater | MacUpdater | NsisUpdater {
    if (isMacOS()) {
        return new MacUpdater(ALPHA_UPDATER_CONFIG);
    }

    if (isLinux()) {
        return new AppImageUpdater(ALPHA_UPDATER_CONFIG);
    }

    return new NsisUpdater(ALPHA_UPDATER_CONFIG);
}
