export const getDownloadedTrackKey = (sourceId: string | undefined, trackId: string) => {
    return `${sourceId ?? 'server'}:${trackId}`;
};

export const getDownloadedCollectionKey = (
    sourceId: string | undefined,
    collectionId: string,
) => {
    return `${sourceId ?? ''}:${collectionId}`;
};
