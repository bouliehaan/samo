import { BrowserWindow, globalShortcut, systemPreferences } from 'electron';

import { isLinux, isMacOS } from '../../../utils';
import { store } from '../settings';

import { PlayerType } from '/@/shared/types/types';

export const enableMediaKeys = (window: BrowserWindow | null) => {
    if (isMacOS()) {
        const shouldPrompt = store.get('should_prompt_accessibility', true) as boolean;
        const shownWarning = store.get('shown_accessibility_warning', false) as boolean;
        const trusted = systemPreferences.isTrustedAccessibilityClient(shouldPrompt);

        if (shouldPrompt) {
            store.set('should_prompt_accessibility', false);
        }

        if (!trusted && !shownWarning) {
            window?.webContents.send('toast-from-main', {
                message:
                    'Samo is not a trusted accessibility client. Media keys will not work until this setting is changed',
                type: 'warning',
            });
            store.set('shown_accessibility_warning', true);
        }
    }

    const enableMediaSession = store.get('mediaSession', false) as boolean;
    const playbackType = store.get('playbackType', PlayerType.WEB) as PlayerType;

    // On macOS + WEB, MediaSession owns all hardware remote events (including Bluetooth
    // headphone buttons via MPRemoteCommandCenter). globalShortcut only handles keyboard HID
    // events and would conflict with MediaSession if registered simultaneously.
    const useGlobalShortcut =
        isLinux() || playbackType !== PlayerType.WEB || (!isMacOS() && !enableMediaSession);

    if (useGlobalShortcut) {
        globalShortcut.register('MediaStop', () => {
            window?.webContents.send('renderer-player-stop');
        });

        globalShortcut.register('MediaPlayPause', () => {
            window?.webContents.send('renderer-player-play-pause');
        });

        globalShortcut.register('MediaNextTrack', () => {
            window?.webContents.send('renderer-player-next');
        });

        globalShortcut.register('MediaPreviousTrack', () => {
            window?.webContents.send('renderer-player-previous');
        });
    }
};

export const disableMediaKeys = () => {
    globalShortcut.unregister('MediaStop');
    globalShortcut.unregister('MediaPlayPause');
    globalShortcut.unregister('MediaNextTrack');
    globalShortcut.unregister('MediaPreviousTrack');
};
