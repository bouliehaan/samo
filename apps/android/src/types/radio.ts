import { type MobileHomeItem } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { type AndroidHomeContentState } from '../services/home-content';
import { type AndroidRecentContentItem } from '../services/recent-content';
import {
    type AddAndroidRadioStationInput,
    type AddAndroidRadioStationResult,
} from '../services/radio-stations';

export interface RadioScreenProps {
    onAddStation: (station: AddAndroidRadioStationInput) => Promise<AddAndroidRadioStationResult>;
    onSelectItem: (item: MobileHomeItem) => void;
    serverConnection: ServerAuthenticationResult | null;
}
