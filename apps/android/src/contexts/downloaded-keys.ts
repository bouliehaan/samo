import { useDownloadsSelector } from '../state/downloads-state';

// These hooks read straight from the module-level downloads store, so a tile
// that shows a "downloaded" tick re-renders when the key Sets change and on
// nothing else. (They used to be React Contexts provided by App.tsx — that
// propagated every download tick through the whole tree.)

export const useDownloadedCollectionKeys = () =>
    useDownloadsSelector((s) => s.downloadedCollectionKeys);
export const useDownloadedTrackKeys = () =>
    useDownloadsSelector((s) => s.downloadedTrackKeys);
