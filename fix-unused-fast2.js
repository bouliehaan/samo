const fs = require('fs');

function processFile(file, replacements) {
    let content = fs.readFileSync(file, 'utf8');
    for (const repl of replacements) {
        content = content.replace(repl.pattern, repl.replacement);
    }
    fs.writeFileSync(file, content);
}

processFile('packages/core/src/mobile/mobile-home.ts', [
    { pattern: /import \{\n    buildRadioPlayback,\n    buildSamoInternetRadioPlayback,/g, replacement: "import {\n    buildSamoInternetRadioPlayback," },
    { pattern: /[ \t]*interface SubsonicAlbumListBody \{[\s\S]*?^\}/gm, replacement: '' },
    { pattern: /[ \t]*interface SubsonicPlaylistsBody \{[\s\S]*?^\}/gm, replacement: '' },
    { pattern: /[ \t]*interface SubsonicRadioBody \{[\s\S]*?^\}/gm, replacement: '' },
    { pattern: /[ \t]*interface SubsonicStarred2Body \{[\s\S]*?^\}/gm, replacement: '' },
    { pattern: /[ \t]*interface SubsonicArtistsBody \{[\s\S]*?^\}/gm, replacement: '' },
    { pattern: /[ \t]*const FULL_COLLECTION_QUALITY_SCAN_LIMIT = [\s\S]*?;\n/g, replacement: '' },
    { pattern: /[ \t]*const LIBRARY_RELEVANT_ALBUM_LIST_SIZE = [\s\S]*?;\n/g, replacement: '' },
    { pattern: /[ \t]*const LIBRARY_RELEVANT_QUALITY_SCAN_LIMIT = [\s\S]*?;\n/g, replacement: '' },
]);

processFile('packages/core/src/mobile/mobile-media-detail.ts', [
    { pattern: /import \{\n    annotateSubsonicAlbumsQuality,\n\} from '\.\/mobile-subsonic-quality';\n/, replacement: '' },
    { pattern: /import \{\n    type SubsonicAlbumListBody,\n    type SubsonicPlayableSong,\n\} from '\.\/mobile-home';\n/, replacement: '' },
    { pattern: /import \{ type SubsonicPlayableSong \} from '\.\/mobile-home';\n/, replacement: '' },
    { pattern: /[ \t]*const tracksHaveHiRes = [\s\S]*?^};/gm, replacement: '' },
    { pattern: /[ \t]*const trackQualityProfile = [\s\S]*?^};/gm, replacement: '' },
    { pattern: /[ \t]*const TOP_SONGS_LIMIT = [\s\S]*?;\n/g, replacement: '' },
    { pattern: /[ \t]*const ARTIST_DETAIL_ALBUM_QUALITY_SCAN_LIMIT = [\s\S]*?;\n/g, replacement: '' },
    { pattern: /[ \t]*const ARTIST_DETAIL_APPEARS_ON_QUALITY_SCAN_LIMIT = [\s\S]*?;\n/g, replacement: '' },
    { pattern: /[ \t]*const sanitizeBiography = [\s\S]*?^};/gm, replacement: '' },
]);

processFile('packages/core/src/mobile/mobile-playlist-edit.ts', [
    { pattern: /    requestJson,\n/g, replacement: '' },
    { pattern: /import \{\n    assertSubsonicOk,\n    subsonicUrl,\n    subsonicUrlWithMultiValueQuery,\n\} from '\.\/mobile-subsonic';\n/, replacement: '' },
    { pattern: /ownerName\?: string,\n/g, replacement: '' },
]);

processFile('packages/core/src/mobile/mobile-search.ts', [
    { pattern: /import \{\n    buildRadioPlayback,\n    buildSamoInternetRadioPlayback,\n    buildSubsonicMusicPlayback,\n/g, replacement: "import {\n    buildSamoInternetRadioPlayback,\n" },
    { pattern: /import \{\n    annotateSubsonicHiResCollections,\n\} from '\.\/mobile-subsonic-quality';\n/, replacement: '' },
    { pattern: /[ \t]*interface SubsonicPlaylistsBody \{[\s\S]*?^\}/gm, replacement: '' },
    { pattern: /[ \t]*interface SubsonicRadioBody \{[\s\S]*?^\}/gm, replacement: '' },
    { pattern: /[ \t]*interface SubsonicTopSongsBody \{[\s\S]*?^\}/gm, replacement: '' },
    { pattern: /[ \t]*interface SubsonicSearchBody \{[\s\S]*?^\}/gm, replacement: '' },
    { pattern: /import \{\n    parseIsoTimestamp,\n\} from '\.\.\/utils\/date';\n/, replacement: '' },
    { pattern: /[ \t]*const TOP_SONGS_ARTIST_FANOUT = [\s\S]*?;\n/g, replacement: '' },
]);

processFile('packages/core/src/server/server-auth.ts', [
    { pattern: /[ \t]*interface NavidromeLoginData \{[\s\S]*?^\}/gm, replacement: '' },
]);

