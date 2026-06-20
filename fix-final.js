const fs = require('fs');

function processFile(file, replacements) {
    let content = fs.readFileSync(file, 'utf8');
    for (const repl of replacements) {
        content = content.replace(repl.pattern, repl.replacement);
    }
    fs.writeFileSync(file, content);
}

processFile('packages/core/src/mobile/mobile-playback.test.ts', [
    { pattern: /[ \t]*const authentication = testServerAuthentication\(\);\n/g, replacement: '' }
]);

processFile('packages/core/src/mobile/mobile-playback.ts', [
    { pattern: /[ \t]*resolveRadioPlaybackDisplay,\n/g, replacement: '' }
]);

processFile('packages/core/src/mobile/mobile-playlist-edit.ts', [
    { pattern: /[ \t]*requestJson,\n/g, replacement: '' }
]);

processFile('packages/core/src/mobile/mobile-search.ts', [
    { pattern: /[ \t]*annotateSubsonicHiResCollections,\n/g, replacement: '' },
    { pattern: /import \{ annotateSubsonicHiResCollections \} from '\.\/mobile-subsonic-quality';\n/g, replacement: '' },
    { pattern: /[ \t]*parseIsoTimestamp,\n/g, replacement: '' },
    { pattern: /import \{ parseIsoTimestamp \} from '\.\.\/utils\/date';\n/g, replacement: '' }
]);
