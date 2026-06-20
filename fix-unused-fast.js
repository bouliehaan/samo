const fs = require('fs');

function processFile(file, replacements) {
    let content = fs.readFileSync(file, 'utf8');
    for (const repl of replacements) {
        content = content.replace(repl.pattern, repl.replacement);
    }
    fs.writeFileSync(file, content);
}

processFile('packages/core/src/mobile/mobile-home.ts', [
    { pattern: /import \{\n    annotateSubsonicAlbumsQuality,\n    annotateSubsonicHiResCollections,\n\} from '\.\/mobile-subsonic-quality';\n/, replacement: '' },
    { pattern: /import \{ annotateSubsonicAlbumsQuality \} from '\.\/mobile-subsonic-quality';\n/, replacement: '' },
    { pattern: /[ \t]*const loadSubsonicHomeContent = async[\s\S]*?^};/gm, replacement: '' },
    { pattern: /[ \t]*qualityScanLimit = limit,\n/g, replacement: '' },
    { pattern: /[ \t]*qualityScanLimit: number,\n/g, replacement: '' },
    { pattern: /[ \t]*qualityScanLimit,\n/g, replacement: '' },
    { pattern: /[ \t]*qualityScanLimit\?: number;\n/g, replacement: '' },
    { pattern: /[ \t]*const getHomeFailureSectionId = [\s\S]*?^};/gm, replacement: '' },
    { pattern: /[ \t]*const loadAllSubsonicAlbums = async[\s\S]*?^};/gm, replacement: '' },
    { pattern: /[ \t]*const loadAllSubsonicArtists = async[\s\S]*?^};/gm, replacement: '' },
    { pattern: /[ \t]*const loadAllSubsonicPlaylists = async[\s\S]*?^};/gm, replacement: '' },
    { pattern: /[ \t]*const loadSubsonicLibraryRelevantItems = async[\s\S]*?^};/gm, replacement: '' },
]);

processFile('packages/core/src/mobile/mobile-media-detail.ts', [
    { pattern: /[ \t]*interface SubsonicUpdatePlaylistBody \{[\s\S]*?^\}/gm, replacement: '' },
    { pattern: /[ \t]*interface SubsonicCreatePlaylistBody \{[\s\S]*?^\}/gm, replacement: '' },
    { pattern: /[ \t]*interface SubsonicSimilarSongsBody \{[\s\S]*?^\}/gm, replacement: '' },
    { pattern: /[ \t]*interface SubsonicTopSongsByArtistBody \{[\s\S]*?^\}/gm, replacement: '' },
    { pattern: /import \{\n    assertSubsonicOk,\n    subsonicCoverArtUrl,\n    subsonicUrl,\n    subsonicUrlWithMultiValueQuery,\n\} from '\.\/mobile-subsonic';\n/, replacement: "import {\n    subsonicCoverArtUrl,\n} from './mobile-subsonic';\n" },
    { pattern: /ownerName\?: string,\n/g, replacement: '' },
    { pattern: /[ \t]*const loadSubsonicAlbumDetail = async[\s\S]*?^};/gm, replacement: '' },
    { pattern: /[ \t]*const loadSubsonicPlaylistDetail = async[\s\S]*?^};/gm, replacement: '' },
    { pattern: /[ \t]*const loadSubsonicArtistDetail = async[\s\S]*?^};/gm, replacement: '' },
    { pattern: /[ \t]*const dedupePlayables = [\s\S]*?^};/gm, replacement: '' },
    { pattern: /[ \t]*export interface LoadSongRadioInput \{[\s\S]*?^\}/gm, replacement: '' },
    { pattern: /    buildSubsonicMusicPlayback,\n/g, replacement: '' },
    { pattern: /    subsonicUrlWithMultiValueQuery,\n/g, replacement: '' },
]);

processFile('packages/core/src/mobile/mobile-playlist-edit.ts', [
    { pattern: /import \{\n    assertSubsonicOk,\n    subsonicUrl,\n    subsonicUrlWithMultiValueQuery,\n\} from '\.\/mobile-media-detail';\n/, replacement: '' },
    { pattern: /ownerName\?: string,\n/g, replacement: '' },
    { pattern: /    requestJson,\n/g, replacement: '' },
    { pattern: /    assertSubsonicOk,\n/g, replacement: '' },
    { pattern: /    subsonicUrl,\n/g, replacement: '' },
    { pattern: /    subsonicUrlWithMultiValueQuery,\n/g, replacement: '' },
]);

processFile('packages/core/src/mobile/mobile-search.ts', [
    { pattern: /[ \t]*const loadSubsonicSearch = async[\s\S]*?^};/gm, replacement: '' },
    { pattern: /[ \t]*qualityScanLimit = limit,\n/g, replacement: '' },
    { pattern: /[ \t]*const getSearchFailureSectionId = [\s\S]*?^};/gm, replacement: '' },
]);

processFile('packages/core/src/server/server-auth.ts', [
    { pattern: /import \{\n    getDefaultServerCapabilities,\n\} from '\.\/server-capabilities';\n/, replacement: '' },
    { pattern: /import \{\n    getSubsonicUser,\n    normalizeBaseUrl,\n\} from '\.\/server-subsonic';\n/, replacement: "import {\n    normalizeBaseUrl,\n} from './server-subsonic';\n" },
    { pattern: /import \{ getSubsonicUser \} from '\.\/server-subsonic';\n/g, replacement: '' },
    { pattern: /[ \t]*interface NavidromeLoginBody \{[\s\S]*?^\}/gm, replacement: '' },
    { pattern: /    getDefaultServerCapabilities,\n/g, replacement: '' },
    { pattern: /    getSubsonicUser,\n/g, replacement: '' },
]);

processFile('packages/core/src/server/server-health.ts', [
    { pattern: /import \{\n    getDefaultServerCapabilities,\n\} from '\.\/server-capabilities';\n/, replacement: '' },
    { pattern: /import \{\n    getSubsonicUser,\n    normalizeBaseUrl,\n\} from '\.\/server-subsonic';\n/, replacement: "import {\n    normalizeBaseUrl,\n} from './server-subsonic';\n" },
    { pattern: /import \{ getSubsonicUser \} from '\.\/server-subsonic';\n/g, replacement: '' },
    { pattern: /    getDefaultServerCapabilities,\n/g, replacement: '' },
    { pattern: /    getSubsonicUser,\n/g, replacement: '' },
]);
