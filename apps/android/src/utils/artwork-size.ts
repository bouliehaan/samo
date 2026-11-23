import { isSamoApiMediaUrl, withSamoImageWidth } from '@samo/core/server';
import { PixelRatio, Platform } from 'react-native';

import { HOME_PRIMARY_TILE } from '../theme/layout';
import { TV_TILE } from '../tv/tv-styles';

/**
 * samo-server's resize ladder (`images.Widths` in samo-server): it renders a
 * cover at the first of these at least as wide as it is asked for, and sends
 * the original for anything wider than the last.
 *
 * A slot asks for its rung, not its exact width, so slots that land on one
 * rung share one URL — one download, one cache file, one decode — where 288
 * and 344 would be two copies of the same 384px image.
 */
const SAMO_IMAGE_WIDTHS = [64, 128, 256, 384, 512, 768, 1024];

/** The width a slot `layoutWidth` dp wide draws its cover from on this
 *  screen. None past the last rung: the original is what the server would
 *  send anyway, so the URL should say so. */
export const getArtworkWidth = (layoutWidth: number | undefined): number | undefined => {
    if (!layoutWidth || layoutWidth <= 0) {
        return undefined;
    }
    const pixels = PixelRatio.getPixelSizeForLayoutSize(layoutWidth);
    return SAMO_IMAGE_WIDTHS.find((width) => width >= pixels);
};

/**
 * A samo cover, asked for at the size its slot draws it (see `getArtworkWidth`).
 * Anything else — another server's art, a source already sized — is returned
 * as it came.
 *
 * Without this a 144dp tile was sent whatever the server stored: 1400px
 * routinely, 3000px often. The bytes were downloaded, kept on disk and decoded
 * every time, to be shrunk to under 300px on screen.
 */
export const sizeArtworkSource = <T extends string | { uri: string }>(
    source: T | undefined,
    layoutWidth: number | undefined,
): T | undefined => {
    const width = getArtworkWidth(layoutWidth);
    if (!source || !width) {
        return source;
    }
    if (typeof source === 'string') {
        return withSamoImageWidth(source, width) as T;
    }
    const sourceObject: { uri: string } = source;
    const uri = withSamoImageWidth(sourceObject.uri, width);
    return uri === sourceObject.uri ? source : ({ ...sourceObject, uri } as T);
};

const WIDTH_PARAM = /([?&])width=[^&#]*(&?)/;

/**
 * A samo cover's address at `width`, or with no width at all: the cover as the
 * server stores it. Unlike `sizeArtworkSource`, a width the address already
 * asks for is replaced, so this names one cover at a chosen size whatever size
 * it was asked for at. Anything but a samo cover is returned as it came.
 */
export const withArtworkWidth = (url: string, width: number | undefined): string => {
    if (!isSamoApiMediaUrl(url)) {
        return url;
    }
    const bare = url.replace(WIDTH_PARAM, (_param, separator: string, rest: string) =>
        rest ? separator : '',
    );
    return width === undefined ? bare : withSamoImageWidth(bare, width);
};

/**
 * The width the on-device cover cache keeps samo covers at: the rung of the
 * tile nearly every cover is drawn as — a shelf or grid tile. Everything
 * smaller (rows, the mini player, sheets) draws from the same file. The few
 * slots larger than this (a detail hero, the full player, the zoom) load their
 * own size and show the cached cover while they do.
 *
 * On a TV the tile is TV_TILE, and a library of originals ran to gigabytes on
 * a box with 8GB of storage. On a phone it is the Home shelf tile, which the
 * View All grid's and search's tiles sit just under.
 */
export const COVER_CACHE_WIDTH = getArtworkWidth(Platform.isTV ? TV_TILE : HOME_PRIMARY_TILE);
