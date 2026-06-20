const fs = require('fs');

const file = 'src/renderer/features/playlists/components/playlist-query-builder.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\/\/ Standard Fields group[\s\S]*?if \(groups\.length === 0\) \{/g, 'if (groups.length === 0) {');

fs.writeFileSync(file, content);
