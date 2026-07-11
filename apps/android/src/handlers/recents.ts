import {
    getDetailQualityProfile,
    getItemQualityProfile,
    type MobileMediaDetail,
    MobileMediaDetailType,
} from '@samo/core/mobile';

import {
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
    type RecentContentRecordOptions,
    savePersistedRecentContentItems,
    upsertRecentContentItem,
} from '../services/recent-content';
import { setRecentContentItems } from '../state/app-session';
import { detailHasHiRes } from '../utils/media-quality';
import { dedupeRecentContentItemsByAlbumIdentity } from '../utils/recent-content-dedupe';

export const recordRecentContentItem = (
    item: AndroidRecentContentSourceItem,
    options?: RecentContentRecordOptions,
): void => {
    setRecentContentItems((current) => {
        const nextItems = dedupeRecentContentItemsByAlbumIdentity(
            upsertRecentContentItem(current, item, Date.now(), options),
        );

        void savePersistedRecentContentItems(nextItems);

        return nextItems;
    });
};

/** Backfill quality/artwork/subtitle onto a recents entry from its loaded
 *  detail, so the Recents shelf upgrades in place without a re-fetch. */
export const enrichRecentAlbumFromDetail = (
    item: AndroidRecentContentSourceItem,
    detail: MobileMediaDetail,
): void => {
    if (detail.type !== MobileMediaDetailType.ALBUM) {
        return;
    }

    const detailProfile = getDetailQualityProfile(detail);
    if (!detailProfile && !detail.artworkUrl && !detail.subtitle) {
        return;
    }

    const key = getRecentContentItemKey(item);
    setRecentContentItems((current) => {
        let changed = false;
        const nextItems = current.map((entry) => {
            if (entry.key !== key) {
                return entry;
            }

            const currentProfile = getItemQualityProfile(entry.item);
            const nextItem: AndroidRecentContentSourceItem = { ...entry.item };
            let itemChanged = false;

            if (
                detailProfile &&
                (!currentProfile ||
                    currentProfile.bitDepth !== detailProfile.bitDepth ||
                    currentProfile.sampleRate !== detailProfile.sampleRate)
            ) {
                nextItem.qualityProfile = detailProfile;
                itemChanged = true;
            }

            if (detailHasHiRes(detail) && !nextItem.isHiRes) {
                nextItem.isHiRes = true;
                itemChanged = true;
            }

            if (!nextItem.artworkUrl && detail.artworkUrl) {
                nextItem.artworkUrl = detail.artworkUrl;
                itemChanged = true;
            }

            if (!nextItem.artworkImageId && detail.artworkImageId) {
                nextItem.artworkImageId = detail.artworkImageId;
                itemChanged = true;
            }

            if (!nextItem.subtitle && detail.subtitle) {
                nextItem.subtitle = detail.subtitle;
                itemChanged = true;
            }

            if (!itemChanged) {
                return entry;
            }

            changed = true;
            return { ...entry, item: nextItem };
        });

        if (!changed) {
            return current;
        }

        void savePersistedRecentContentItems(nextItems);
        return nextItems;
    });
};
