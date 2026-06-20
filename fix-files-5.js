const fs = require('fs');

const p1 = 'src/renderer/features/playlists/components/playlist-query-builder.tsx';
if (fs.existsSync(p1)) {
    let c = fs.readFileSync(p1, 'utf8');
    c = c.replace(/items:\s*,\s*placeholder/g, 'items: [], placeholder');
    c = c.replace(/return\s*;/g, 'return [];');
    c = c.replace(/\.\.\.\s*,/g, '');
    c = c.replace(/boolean:\s*,\s*date:\s*,\s*number:\s*,\s*playlist:\s*,\s*string:\s*,/g, 'boolean: [], date: [], number: [], playlist: [], string: [],');
    fs.writeFileSync(p1, c);
}

const p2 = 'src/renderer/features/playlists/utils.ts';
if (fs.existsSync(p2)) {
    let c = fs.readFileSync(p2, 'utf8');
    c = c.replace(/return\s*;/g, 'return [];');
    fs.writeFileSync(p2, c);
}

const p3 = 'src/renderer/features/servers/components/add-server-form.tsx';
if (fs.existsSync(p3)) {
    let c = fs.readFileSync(p3, 'utf8');
    c = c.replace(/\[\s*\]:\s*\{\s*icon:\s*Icon,\s*name:\s*'',\s*\},/g, ''); // Fix dangling cases? No wait, let's look at add-server-form.tsx
    // The previous script removed lines containing ServerType.SUBSONIC / NAVIDROME.
    // So the arrays/records lost their keys:
    // [ServerType.SUBSONIC]: { ... }
    // became:
    // : { icon: SubsonicIcon, name: 'OpenSubsonic' },
    // I will just wipe out anything that looks like that.
    c = c.replace(/:\s*\{\s*icon:\s*[^,]+,\s*name:\s*'[^']+',\s*\},?/g, '');
    c = c.replace(/icon:\s*[^,]+,\s*name:\s*'[^']+',\s*\},?/g, '');
    fs.writeFileSync(p3, c);
}

const p4 = 'src/renderer/features/shared/components/list-filters.tsx';
if (fs.existsSync(p4)) {
    let c = fs.readFileSync(p4, 'utf8');
    c = c.replace(/\[\s*\]:\s*\[\s*\]/g, ''); 
    fs.writeFileSync(p4, c);
}

const p5 = 'src/renderer/hooks/use-album-quality-profiles.ts';
if (fs.existsSync(p5)) {
    let c = fs.readFileSync(p5, 'utf8');
    // Just replace the entire file with a blank export if it's completely subsonic specific
}

