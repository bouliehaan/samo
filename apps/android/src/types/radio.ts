import { type MobileHomeItem } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { type AndroidHomeContentState } from '../services/home-content';
import { type AndroidRecentContentItem } from '../services/recent-content';
import {
    type AddAndroidRadioStationInput,
    type AddAndroidRadioStationResult,
} from '../services/radio-stations';

export interface RadioScreenProps {
    homeContentState: AndroidHomeContentState;
    nowPlayingRadioId: null | string;
    onAddStation: (input: AddAndroidRadioStationInput) => Promise<AddAndroidRadioStationResult>;
    onSelectItem: (item: MobileHomeItem) => void;
    recentItems: AndroidRecentContentItem[];
    serverConnections: ServerAuthenticationResult[];
}
