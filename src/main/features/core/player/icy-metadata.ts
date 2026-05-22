import http from 'node:http';
import https from 'node:https';

const parseIcyStreamTitle = (
    raw: string,
): null | { artist: null | string; title: null | string } => {
    const streamTitleMatch =
        raw.match(/StreamTitle='([^']*)'/i) || raw.match(/StreamTitle="([^"]*)"/i);
    const streamTitle = streamTitleMatch?.[1]?.trim();

    if (!streamTitle) {
        return null;
    }

    const splitMatch = streamTitle.match(/^(.*?)\s*[-–—]\s*(.+)$/);

    if (splitMatch) {
        return {
            artist: splitMatch[1].trim() || null,
            title: splitMatch[2].trim() || null,
        };
    }

    return {
        artist: null,
        title: streamTitle,
    };
};

export const fetchIcyMetadata = (
    streamUrl: string,
    redirectCount = 0,
): Promise<null | { artist: null | string; title: null | string }> => {
    return new Promise((resolve) => {
        let settled = false;

        const finish = (value: null | { artist: null | string; title: null | string }) => {
            if (settled) return;
            settled = true;
            resolve(value);
        };

        try {
            const url = new URL(streamUrl);
            const client = url.protocol === 'https:' ? https : http;

            const request = client.request(
                url,
                {
                    headers: {
                        'Icy-MetaData': '1',
                        'User-Agent': 'samo',
                    },
                    timeout: 12000,
                },
                (response) => {
                    const location = response.headers.location;

                    if (
                        location &&
                        response.statusCode &&
                        response.statusCode >= 300 &&
                        response.statusCode < 400 &&
                        redirectCount < 5
                    ) {
                        response.destroy();
                        const redirectedUrl = new URL(location, streamUrl).toString();
                        fetchIcyMetadata(redirectedUrl, redirectCount + 1).then(finish);
                        return;
                    }

                    const metaintHeader = response.headers['icy-metaint'];
                    const metaint = Array.isArray(metaintHeader)
                        ? Number(metaintHeader[0])
                        : Number(metaintHeader);

                    const icyName = Array.isArray(response.headers['icy-name'])
                        ? response.headers['icy-name'][0]
                        : response.headers['icy-name'];

                    if (!Number.isFinite(metaint) || metaint <= 0) {
                        response.destroy();
                        finish(
                            typeof icyName === 'string' && icyName.trim()
                                ? { artist: null, title: icyName.trim() }
                                : null,
                        );
                        return;
                    }

                    let audioBytesUntilMetadata = metaint;
                    let metadataLength: null | number = null;
                    let metadataBuffer = Buffer.alloc(0);

                    response.on('data', (chunk: Buffer) => {
                        let offset = 0;

                        while (offset < chunk.length) {
                            if (audioBytesUntilMetadata > 0) {
                                const consume = Math.min(
                                    audioBytesUntilMetadata,
                                    chunk.length - offset,
                                );
                                audioBytesUntilMetadata -= consume;
                                offset += consume;
                                continue;
                            }

                            if (metadataLength === null) {
                                metadataLength = chunk[offset] * 16;
                                offset += 1;

                                if (metadataLength === 0) {
                                    audioBytesUntilMetadata = metaint;
                                    metadataLength = null;
                                }

                                continue;
                            }

                            const remainingMetadataBytes = metadataLength - metadataBuffer.length;
                            const consume = Math.min(remainingMetadataBytes, chunk.length - offset);

                            metadataBuffer = Buffer.concat([
                                metadataBuffer,
                                chunk.subarray(offset, offset + consume),
                            ]);

                            offset += consume;

                            if (metadataBuffer.length >= metadataLength) {
                                const rawMetadata = metadataBuffer
                                    .toString('utf8')
                                    .replace(/\0+$/g, '')
                                    .trim();

                                response.destroy();

                                const parsedMetadata = parseIcyStreamTitle(rawMetadata);

                                finish(
                                    parsedMetadata ||
                                        (typeof icyName === 'string' && icyName.trim()
                                            ? { artist: null, title: icyName.trim() }
                                            : null),
                                );
                                return;
                            }
                        }
                    });

                    response.on('end', () => finish(null));
                    response.on('error', () => finish(null));
                },
            );

            request.on('timeout', () => {
                request.destroy();
                finish(null);
            });

            request.on('error', () => finish(null));
            request.end();
        } catch {
            finish(null);
        }
    });
};
