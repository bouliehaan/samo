const fs = require('fs');

// mobile-home.ts
let mh = fs.readFileSync('packages/core/src/mobile/mobile-home.ts', 'utf8');
mh = mh.replace(/import \{.*?buildRadioPlayback,.*?\} from '\.\/mobile-playback';/, (m) => m.replace('buildRadioPlayback,', ''));
mh = mh.replace(/const LIBRARY_RELEVANT_ALBUM_LIST_SIZE = 25;\n/g, '');
mh = mh.replace(/const LIBRARY_RELEVANT_QUALITY_SCAN_LIMIT = 50;\n/g, '');
// For the others, I can just find the functions and remove them. But wait, getHomeFailureSectionId is a function.
mh = mh.replace(/const getHomeFailureSectionId = [\s\S]*?;\n/g, '');
// There are unused parameters like qualityScanLimit. Let's just fix the files manually if regex is hard.
fs.writeFileSync('packages/core/src/mobile/mobile-home.ts', mh);

// mobile-media-detail.ts
let mmd = fs.readFileSync('packages/core/src/mobile/mobile-media-detail.ts', 'utf8');
mmd = mmd.replace(/import \{\n    type SubsonicAlbumListBody,\n    type SubsonicPlayableSong,\n\} from '\.\/mobile-home';\n/g, '');
mmd = mmd.replace(/ownerName\?: string,/g, '');
fs.writeFileSync('packages/core/src/mobile/mobile-media-detail.ts', mmd);

// mobile-playlist-edit.ts
let mpe = fs.readFileSync('packages/core/src/mobile/mobile-playlist-edit.ts', 'utf8');
mpe = mpe.replace(/    requestJson,\n/g, '');
mpe = mpe.replace(/import \{\n    assertSubsonicOk,\n    subsonicUrl,\n    subsonicUrlWithMultiValueQuery,\n\} from '\.\/mobile-media-detail';\n/g, '');
mpe = mpe.replace(/ownerName\?: string,/g, '');
fs.writeFileSync('packages/core/src/mobile/mobile-playlist-edit.ts', mpe);

// mobile-search.ts
let ms = fs.readFileSync('packages/core/src/mobile/mobile-search.ts', 'utf8');
ms = ms.replace(/    buildRadioPlayback,\n/g, '');
ms = ms.replace(/    buildSubsonicMusicPlayback,\n/g, '');
ms = ms.replace(/import \{\n    annotateSubsonicHiResCollections,\n\} from '\.\/mobile-hi-res';\n/g, '');
ms = ms.replace(/interface SubsonicPlaylistsBody \{[\s\S]*?\}\n/g, '');
ms = ms.replace(/interface SubsonicRadioBody \{[\s\S]*?\}\n/g, '');
ms = ms.replace(/interface SubsonicTopSongsBody \{[\s\S]*?\}\n/g, '');
ms = ms.replace(/interface SubsonicSearchBody \{[\s\S]*?\}\n/g, '');
ms = ms.replace(/import \{\n    parseIsoTimestamp,\n\} from '\.\.\/utils\/date';\n/g, '');
ms = ms.replace(/import \{\n    subsonicCoverArtUrl,\n\} from '\.\/mobile-media-detail';\n/g, '');
ms = ms.replace(/const getSearchFailureSectionId = [\s\S]*?;\n/g, '');
fs.writeFileSync('packages/core/src/mobile/mobile-search.ts', ms);

// server-auth.ts
let sa = fs.readFileSync('packages/core/src/server/server-auth.ts', 'utf8');
sa = sa.replace(/import \{\n    getDefaultServerCapabilities,\n\} from '\.\/server-capabilities';\n/g, '');
fs.writeFileSync('packages/core/src/server/server-auth.ts', sa);

// server-health.ts
let sh = fs.readFileSync('packages/core/src/server/server-health.ts', 'utf8');
sh = sh.replace(/import \{\n    getDefaultServerCapabilities,\n\} from '\.\/server-capabilities';\n/g, '');
fs.writeFileSync('packages/core/src/server/server-health.ts', sh);

