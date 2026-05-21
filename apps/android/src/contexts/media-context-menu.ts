import {
    type MobileContentSource,
    type MobileMediaDetail,
    type MobileMediaTrack,
} from '@samo/core/mobile';
import {
    createContext,
    useContext,
} from 'react';

import { type AndroidRecentContentSourceItem } from '../services/recent-content';

export type MediaContextMenuKind =
    | 'album'
    | 'artist'
    | 'audiobook'
    | 'playlist'
    | 'podcast'
    | 'radio'
    | 'song';

export interface MediaContextMenuOpenOptions {
    // True when the menu is opened from the detail page itself, so we should
    // skip the "Open Album/Playlist/Artist" action (you're already there).
    suppressOpenAction?: boolean;
    // True when there's already a visible Download button next to where the
    // menu was opened (e.g. the detail page hero), so the duplicate is clutter.
    suppressDownloadAction?: boolean;
    // True when the menu is opened from a playback surface where "queue this"
    // would be conceptually backwards, namely the fullscreen player.
    suppressQueueAction?: boolean;
}

export type MediaContextMenuTarget =
    | {
          detail?: MobileMediaDetail;
          kind: 'song';
          source?: MobileContentSource;
          suppressDownloadAction?: boolean;
          suppressOpenAction?: boolean;
          suppressQueueAction?: boolean;
          track: MobileMediaTrack;
      }
    | {
          item: AndroidRecentContentSourceItem;
          kind: Exclude<MediaContextMenuKind, 'song'>;
          suppressDownloadAction?: boolean;
          suppressOpenAction?: boolean;
          suppressQueueAction?: boolean;
      };

export interface MediaContextMenuApi {
    openForItem: (
        item: AndroidRecentContentSourceItem,
        options?: MediaContextMenuOpenOptions,
    ) => void;
    openForTrack: (track: MobileMediaTrack, detail?: MobileMediaDetail) => void;
}

export const MediaContextMenuContext = createContext<MediaContextMenuApi>({
    openForItem: () => undefined,
    openForTrack: () => undefined,
});

export const useMediaContextMenu = () => useContext(MediaContextMenuContext);
