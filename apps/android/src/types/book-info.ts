import { type MobileMediaDetail } from '@samo/core/mobile';

import { type AndroidRecentContentSourceItem } from '../services/recent-content';

/** Which kind of thing the information sheet is describing. */
export type BookInfoVariant = 'audiobook' | 'episode' | 'podcast';

/**
 * A single podcast episode's own metadata.
 *
 * Carried inline rather than fetched: by the time an episode can be
 * long-pressed its row is already on screen, so the track in hand holds
 * everything the sheet shows. There is no loading or error state for this
 * variant because there is no request.
 */
export interface BookInfoEpisode {
    description?: string;
    durationSeconds?: number;
    publishedAt?: number;
    subtitle?: string;
    title: string;
}

export type BookInfoState =
    | {
          detail: MobileMediaDetail;
          item: AndroidRecentContentSourceItem;
          status: 'loaded';
          variant: 'audiobook' | 'podcast';
      }
    | {
          episode: BookInfoEpisode;
          item: AndroidRecentContentSourceItem;
          status: 'loaded';
          variant: 'episode';
      }
    | {
          item: AndroidRecentContentSourceItem;
          message: string;
          status: 'error';
          variant: 'audiobook' | 'podcast';
      }
    | {
          item: AndroidRecentContentSourceItem;
          status: 'loading';
          variant: 'audiobook' | 'podcast';
      }
    | { status: 'idle' };
