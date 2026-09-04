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
import { type AndroidQueuePlaylistOrigin } from '../state/playback-queue-store';

export type MediaContextMenuKind =
    | 'album'
    | 'artist'
    | 'audiobook'
    | 'playlist'
    | 'podcast'
    | 'radio'
    | 'song';

export interface MediaContextMenuOpenOptions {
    // True when opened from the Home screen, so the menu offers "Remove from
    // Home" (a non-destructive per-device hide). Off everywhere else.
    allowRemoveFromHome?: boolean;
    // The item is being acted on from inside the Explore drop playlist, for
    // surfaces with no detail page to say so — the fullscreen player, which
    // reads it off the queue it is playing. Explore-only actions (Keep in
    // Library, and the copy-first playlist add) are the reason it matters:
    // without it they disappeared the moment you opened the player over the
    // Explore playlist you were listening to.
    fromExplo?: boolean;
    // The editable playlist the playing track came from, for the fullscreen
    // player — which has no detail page to name it, and whose queue is not
    // itself proof of membership (Up Next can hold appended strangers). Set
    // only when the track really is one of that playlist's own; see
    // AndroidQueuePlaylistOrigin.
    queuePlaylist?: AndroidQueuePlaylistOrigin;
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
          /** See MediaContextMenuOpenOptions.fromExplo. */
          fromExplo?: boolean;
          kind: 'song';
          /** See MediaContextMenuOpenOptions.queuePlaylist. */
          queuePlaylist?: AndroidQueuePlaylistOrigin;
          // Content key to hide when "Remove from Home" is chosen; only set when
          // the menu was opened from the Home screen.
          removeFromHomeKey?: string;
          source?: MobileContentSource;
          suppressDownloadAction?: boolean;
          suppressOpenAction?: boolean;
          suppressQueueAction?: boolean;
          track: MobileMediaTrack;
      }
    | {
          item: AndroidRecentContentSourceItem;
          kind: Exclude<MediaContextMenuKind, 'song'>;
          removeFromHomeKey?: string;
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
