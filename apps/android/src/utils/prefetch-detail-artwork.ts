import { type MobileMediaDetail } from '@samo/core/mobile';
import { Image as ExpoImage } from 'expo-image';

const MAX_PREFETCH_URLS = 18;

export const prefetchDetailArtworkUrls = (
    detail: MobileMediaDetail,
    extraUrls: Array<string | undefined> = [],
): void => {
    const urls = new Set<string>();
    for (const url of extraUrls) {
        if (url) {
            urls.add(url);
        }
    }
    if (detail.artworkUrl) {
        urls.add(detail.artworkUrl);
    }
    for (const item of detail.items?.slice(0, MAX_PREFETCH_URLS) ?? []) {
        if (item.artworkUrl) {
            urls.add(item.artworkUrl);
        }
    }
    for (const track of detail.topTracks?.slice(0, 8) ?? []) {
        if (track.artworkUrl) {
            urls.add(track.artworkUrl);
        }
    }
    for (const item of detail.appearsOnItems?.slice(0, 6) ?? []) {
        if (item.artworkUrl) {
            urls.add(item.artworkUrl);
        }
    }
    for (const item of detail.relatedArtists?.slice(0, 6) ?? []) {
        if (item.artworkUrl) {
            urls.add(item.artworkUrl);
        }
    }
    for (const url of urls) {
        void ExpoImage.prefetch(url, 'memory-disk');
    }
};

export const prefetchArtworkUrl = (url: string | undefined): void => {
    if (!url) {
        return;
    }
    void ExpoImage.prefetch(url, 'memory-disk');
};
