export const getHighResolutionArtworkUrl = (
    artworkUrl: string | null | undefined,
    size = 1200,
): string | undefined => {
    if (!artworkUrl) return undefined;

    try {
        const url = new URL(artworkUrl);

        if (url.searchParams.has('size')) {
            url.searchParams.set('size', String(size));
        }

        return url.toString();
    } catch {
        return artworkUrl;
    }
};
