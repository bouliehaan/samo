export const getHighResolutionArtworkUrl = (
    artworkUrl: string | null | undefined,
    size = 1200,
): string | undefined => {
    if (!artworkUrl) return undefined;

    try {
        const url = new URL(artworkUrl);
        const isSubsonicCoverArt = url.pathname.toLowerCase().includes('getcoverart');

        if (url.searchParams.has('size') || isSubsonicCoverArt) {
            url.searchParams.set('size', String(size));
        }

        return url.toString();
    } catch {
        return artworkUrl;
    }
};
