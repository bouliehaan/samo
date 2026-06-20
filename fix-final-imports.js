const fs = require('fs');

function processFile(file, replacements) {
    let content = fs.readFileSync(file, 'utf8');
    for (const repl of replacements) {
        content = content.replace(repl.pattern, repl.replacement);
    }
    fs.writeFileSync(file, content);
}

processFile('packages/core/src/mobile/mobile-media-detail.ts', [
    { pattern: /import \{ type SubsonicPlayableSong \} from '\.\/mobile-home';\n/g, replacement: '' },
    { pattern: /import \{\n    type SubsonicAlbumListBody,\n    type SubsonicPlayableSong,\n\} from '\.\/mobile-home';\n/g, replacement: '' },
    { pattern: /import \{ SubsonicPlayableSong \} from '\.\/mobile-playback';\n/g, replacement: '' }
]);

processFile('packages/core/src/mobile/mobile-search.ts', [
    { pattern: /import \{\n    buildSamoInternetRadioPlayback,\n    buildSubsonicMusicPlayback,\n\} from '\.\/mobile-playback';/g, replacement: "import {\n    buildSamoInternetRadioPlayback,\n} from './mobile-playback';" },
    { pattern: /    buildSubsonicMusicPlayback,\n/g, replacement: '' }
]);
