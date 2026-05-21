import { type MobileMediaDetail } from '@samo/core/mobile';

import { type AndroidRecentContentSourceItem } from '../services/recent-content';

export type BookInfoState =
    | {
          detail: MobileMediaDetail;
          item: AndroidRecentContentSourceItem;
          status: 'loaded';
          variant: 'audiobook' | 'podcast';
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
