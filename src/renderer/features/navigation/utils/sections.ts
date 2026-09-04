import { AppRoute } from '/@/renderer/router/routes';

/**
 * The app's top-level places, and which routes belong to each.
 *
 * Separated from the pill row itself because "which section am I in" is the
 * part with rules worth testing: a detail page has to keep its parent section
 * lit (an album is somewhere inside Music), and Home must not light up on all
 * of them just because every path starts with a slash.
 */

export interface NavSection {
    id: NavSectionId;
    /** True when this section needs samo's long-form catalog behind it. */
    ifLongFormServer?: boolean;
    /** True when this section needs a music server behind it. */
    ifMusicServer?: boolean;
    label: string;
    /**
     * Every path that belongs to this section. The first is where the pill
     * navigates; the rest only decide which pill is lit.
     */
    paths: string[];
}

export type NavSectionId = 'audiobooks' | 'music' | 'podcasts' | 'radio';

/**
 * Home is deliberately absent: the header already carries a circular home
 * button beside the search field, and a pill saying the same thing next to it
 * would be two controls for one destination. Nothing is lit on Home, which is
 * correct — Home is not one of these sections, it is where they all start.
 */
export const NAV_SECTIONS: NavSection[] = [
    {
        id: 'music',
        ifMusicServer: true,
        label: 'Music',
        // Album, artist, genre, song and playlist pages are all inside Music —
        // they are how you got there from one of its shelves.
        paths: [AppRoute.MUSIC, '/library', AppRoute.PLAYLISTS, AppRoute.FAVORITES],
    },
    {
        id: 'podcasts',
        ifLongFormServer: true,
        label: 'Podcasts',
        paths: [AppRoute.PODCASTS],
    },
    {
        id: 'audiobooks',
        ifLongFormServer: true,
        label: 'Audiobooks',
        paths: [AppRoute.AUDIOBOOKS],
    },
    { id: 'radio', ifMusicServer: true, label: 'Radio', paths: [AppRoute.RADIO] },
];

/**
 * A section owns a path and everything beneath it — `/podcasts/show_1` is
 * still Podcasts. The trailing slash matters: without it `/radio` would also
 * claim `/radiostations`.
 */
const matchesPath = (pathname: string, path: string): boolean =>
    pathname === path || pathname.startsWith(`${path}/`);

export const matchesNavSection = (pathname: string, section: NavSection): boolean =>
    section.paths.some((path) => matchesPath(pathname, path));

/**
 * A section with no server behind it is not a place you can go. Podcasts and
 * audiobooks need a long-form server, so without one the row is two pills
 * rather than four with two of them dead.
 */
export const availableNavSections = (capabilities: {
    hasLongFormServer: boolean;
    hasMusicServer: boolean;
}): NavSection[] =>
    NAV_SECTIONS.filter((section) => {
        if (section.ifMusicServer && !capabilities.hasMusicServer) {
            return false;
        }
        if (section.ifLongFormServer && !capabilities.hasLongFormServer) {
            return false;
        }
        return true;
    });

/** Which pill should be lit, or undefined on a route that belongs to none. */
export const activeNavSectionId = (
    pathname: string,
    sections: NavSection[],
): NavSectionId | undefined => sections.find((section) => matchesNavSection(pathname, section))?.id;
