const fs = require('fs');

function processFile(file) {
    let content = fs.readFileSync(file, 'utf8');

    // Remove if blocks for NAVIDROME/SUBSONIC
    content = content.replace(/[ \t]*if \([\s\S]*?(?:NAVIDROME|SUBSONIC)[\s\S]*?\) \{[\s\S]*?\n[ \t]*\}\n/g, '');

    // Remove specific functions that might cause unused variables
    content = content.replace(/[ \t]*const loadSubsonic.*? = async [\s\S]*?^};/gm, '');
    content = content.replace(/[ \t]*const getHomeFailureSectionId = [\s\S]*?^};/gm, '');
    content = content.replace(/[ \t]*const getSearchFailureSectionId = [\s\S]*?^};/gm, '');

    // Remove unused imports (Regex approach)
    content = content.replace(/import \{[^}]*?(?:Subsonic|buildRadioPlayback|qualityScanLimit)[^}]*?\} from '[^']+';\n/g, '');

    // mobile-home specific fix for originalReleaseDate -> releaseYear
    content = content.replace(/track\.releaseYear \?\? track\.originalReleaseDate/g, 'track.releaseYear');
    
    // server-auth/health fixes
    content = content.replace(/[ \t]*export const authenticateNavidromeServer = [\s\S]*?^};/gm, '');
    content = content.replace(/[ \t]*export const authenticateSubsonicServer = [\s\S]*?^};/gm, '');
    content = content.replace(/[ \t]*case ServerType\.NAVIDROME:[\s\S]*?(?:return|break).*?;/g, '');
    content = content.replace(/[ \t]*case ServerType\.SUBSONIC:[\s\S]*?(?:return|break).*?;/g, '');
    content = content.replace(/[ \t]*export const checkNavidromeHealth = [\s\S]*?^};/gm, '');

    fs.writeFileSync(file, content);
}

['packages/core/src/mobile/mobile-home.ts', 
 'packages/core/src/mobile/mobile-media-detail.ts', 
 'packages/core/src/mobile/mobile-playlist-edit.ts', 
 'packages/core/src/mobile/mobile-search.ts',
 'packages/core/src/server/server-auth.ts',
 'packages/core/src/server/server-health.ts'].forEach(processFile);
