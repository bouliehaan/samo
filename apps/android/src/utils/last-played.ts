import { type MobilePlayableAudio } from '@samo/core/mobile';

export const getLastPlayedPersistenceKey = (item: MobilePlayableAudio): string =>
    `${item.contentSourceId ?? 'server'}:${item.id}`;
