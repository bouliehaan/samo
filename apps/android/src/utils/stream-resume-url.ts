/** True when the samo stream URL encodes a non-zero resume offset (server-side byte/range skip). */
export const streamUrlHasEmbeddedResume = (url: string | undefined): boolean => {
    if (!url) {
        return false;
    }

    try {
        const params = new URL(url).searchParams;
        for (const key of ['offsetSeconds', 'progressSeconds', 'at']) {
            if (!params.has(key)) {
                continue;
            }
            const raw = params.get(key);
            if (raw === null || raw === '') {
                continue;
            }
            const seconds = Number.parseInt(raw, 10);
            if (Number.isFinite(seconds) && seconds > 0) {
                return true;
            }
        }
        return false;
    } catch {
        return /[?&](offsetSeconds|progressSeconds|at)=\d+/i.test(url);
    }
};
