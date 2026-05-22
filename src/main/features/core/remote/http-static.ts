import { app } from 'electron';
import { promises, Stats } from 'fs';
import { readFile } from 'fs/promises';
import { IncomingMessage, ServerResponse } from 'http';
import { join } from 'path';
import { deflate, gzip } from 'zlib';

export interface MimeType {
    css: string;
    html: string;
    ico: string;
    js: string;
    png: string;
    svg: string;
}

export const MIME_TYPES: MimeType = {
    css: 'text/css',
    html: 'text/html; charset=UTF-8',
    ico: 'image/x-icon',
    js: 'application/javascript',
    png: 'image/png',
    svg: 'image/svg+xml',
};

export enum Encoding {
    GZIP = 'gzip',
    NONE = 'none',
    ZLIB = 'deflate',
}

const GZIP_REGEX = /\bgzip\b/;
const ZLIB_REGEX = /\bdeflate\b/;

export const getEncoding = (encoding: string | string[]): Encoding => {
    const encodingArray = Array.isArray(encoding) ? encoding : [encoding];

    for (const code of encodingArray) {
        if (code.match(GZIP_REGEX)) {
            return Encoding.GZIP;
        }
        if (code.match(ZLIB_REGEX)) {
            return Encoding.ZLIB;
        }
    }

    return Encoding.NONE;
};

const cache = new Map<string, Map<Encoding, [number, Buffer]>>();

const setOk = (
    res: ServerResponse,
    mtimeMs: number,
    extension: keyof MimeType,
    encoding: Encoding,
    data?: Buffer,
) => {
    res.statusCode = data ? 200 : 304;

    res.setHeader('Content-Type', MIME_TYPES[extension]);
    res.setHeader('ETag', `"${mtimeMs}"`);
    res.setHeader('Cache-Control', 'public');

    if (encoding !== 'none') res.setHeader('Content-Encoding', encoding);
    res.end(data);
};

export async function serveFile(
    req: IncomingMessage,
    file: string,
    extension: keyof MimeType,
    res: ServerResponse,
): Promise<void> {
    const fileName = `${file}.${extension}`;
    const path = app.isPackaged
        ? join(__dirname, '../remote', fileName)
        : join(__dirname, '../../out/remote', fileName);

    let stats: Stats;

    try {
        stats = await promises.stat(path);
    } catch (error) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end((error as Error).message);
        // This is a resolve, even though it is an error, because we want specific (non 500) status
        return Promise.resolve();
    }

    const encodings = req.headers['accept-encoding'] ?? '';
    const selectedEncoding = getEncoding(encodings);

    const ifMatch = req.headers['if-none-match'];

    const fileInfo = cache.get(fileName);
    let cached = fileInfo?.get(selectedEncoding);

    if (cached && cached[0] !== stats.mtimeMs) {
        cache.get(fileName)!.delete(selectedEncoding);
        cached = undefined;
    }

    if (ifMatch && cached) {
        const options = ifMatch.split(',');

        for (const option of options) {
            const mTime = Number(option.replaceAll('"', '').trim());

            if (cached[0] === mTime) {
                setOk(res, cached[0], extension, selectedEncoding);
                return Promise.resolve();
            }
        }
    }

    if (!cached || cached[0] !== stats.mtimeMs) {
        const content = await readFile(path);

        switch (selectedEncoding) {
            case Encoding.GZIP:
                return new Promise((resolve, reject) => {
                    gzip(content, (error, result) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        const newEntry: [number, Buffer] = [stats.mtimeMs, result];

                        if (fileInfo) {
                            fileInfo.set(selectedEncoding, newEntry);
                        } else {
                            cache.set(fileName, new Map([[selectedEncoding, newEntry]]));
                        }

                        setOk(res, stats.mtimeMs, extension, selectedEncoding, result);
                        resolve();
                    });
                });

            case Encoding.ZLIB:
                return new Promise((resolve, reject) => {
                    deflate(content, (error, result) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        const newEntry: [number, Buffer] = [stats.mtimeMs, result];

                        if (fileInfo) {
                            fileInfo.set(selectedEncoding, newEntry);
                        } else {
                            cache.set(fileName, new Map([[selectedEncoding, newEntry]]));
                        }

                        setOk(res, stats.mtimeMs, extension, selectedEncoding, result);
                        resolve();
                    });
                });
            default: {
                const newEntry: [number, Buffer] = [stats.mtimeMs, content];

                if (fileInfo) {
                    fileInfo.set(selectedEncoding, newEntry);
                } else {
                    cache.set(fileName, new Map([[selectedEncoding, newEntry]]));
                }

                setOk(res, stats.mtimeMs, extension, selectedEncoding, content);
                return Promise.resolve();
            }
        }
    }

    setOk(res, cached[0], extension, selectedEncoding, cached[1]);

    return Promise.resolve();
}
