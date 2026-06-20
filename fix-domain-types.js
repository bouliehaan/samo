const fs = require('fs');
let content = fs.readFileSync('src/shared/types/domain-types.ts', 'utf8');

// Remove navidrome/subsonic Record lines
content = content.replace(/^[ \t]*(navidrome|subsonic): Record<[^>]+>;\n/gm, '');

// Remove AlbumListNavidromeQuery
content = content.replace(/interface AlbumListNavidromeQuery \{[\s\S]*?\n\}\n/g, '');
content = content.replace(/ extends AlbumListNavidromeQuery,/g, '');

// Remove navidrome/subsonic object properties (which span multiple lines)
// This regex uses lazy matching to find the object blocks
content = content.replace(/^[ \t]*(navidrome|subsonic): \{[\s\S]*?^\s*\},?\n/gm, '');

// Also remove any remaining navidrome?: null; or similar
content = content.replace(/^[ \t]*(navidrome|subsonic)\?:[^;\n]+;\n/gm, '');

fs.writeFileSync('src/shared/types/domain-types.ts', content);
