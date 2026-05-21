import { BrowserWindow, Menu, MenuItemConstructorOptions } from 'electron';
import { PlayerRepeat, PlayerStatus } from '/@/shared/types/types';
export type MenuPlaybackState = {
    accelerators?: {
        next?: string;
        playPause?: string;
        previous?: string;
        repeat?: string;
        seekBackward?: string;
        seekForward?: string;
        shuffle?: string;
        stop?: string;
        volumeDown?: string;
        volumeUp?: string;
    };
    playbackStatus?: PlayerStatus;
    privateMode?: boolean;
    repeatMode?: PlayerRepeat;
    shuffleEnabled?: boolean;
    sidebarCollapsed?: boolean;
};
export default class MenuBuilder {
    developmentEnvironmentSetup: boolean;
    mainWindow: BrowserWindow;
    constructor(mainWindow: BrowserWindow);
    buildDarwinTemplate({ accelerators, playbackStatus, privateMode, repeatMode, shuffleEnabled, sidebarCollapsed, }?: MenuPlaybackState): MenuItemConstructorOptions[];
    buildDefaultTemplate(): MenuItemConstructorOptions[];
    buildMenu(playbackState?: MenuPlaybackState): Menu;
    setupDevelopmentEnvironment(): void;
}
