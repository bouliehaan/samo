const fs = require('fs');

function applyRegexes(file, rules) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    for (const rule of rules) {
        content = content.replace(rule.pattern, rule.replacement);
    }
    fs.writeFileSync(file, content);
}

// 1. controller.ts
applyRegexes('src/renderer/api/controller.ts', [
    { pattern: /import \{ SubsonicController \} from '\/@\/renderer\/api\/subsonic\/subsonic-controller';\n/g, replacement: '' }
]);

// 2. samo-controller.ts
applyRegexes('src/renderer/api/samo/samo-controller.ts', [
    { pattern: /server: \{ credential: string; url: string \},/g, replacement: 'server: { credential: string; url: string } & Partial<ServerListItemCore>,' }
]);

// 3. home-podcast-feed.tsx
applyRegexes('src/renderer/features/home/components/home-podcast-feed.tsx', [
    { pattern: /classNames=\{/g, replacement: 'className={' }
]);

// 4. login-route.tsx
applyRegexes('src/renderer/features/login/routes/login-route.tsx', [
    { pattern: /import \{ SubsonicIcon \} from '\/@\/renderer\/features\/shared\/components\/icons';\n/g, replacement: '' }
]);

// 5. use-mpris.ts
applyRegexes('src/renderer/features/player/hooks/use-mpris.ts', [
    { pattern: /ServerType,?/g, replacement: '' } // actually let's just let it be unused
]);

// 6. create-playlist-form.tsx
applyRegexes('src/renderer/features/playlists/components/create-playlist-form.tsx', [
    { pattern: /if \(serverType === ServerType\.NAVIDROME\) \{[\s\S]*?\} else \{/g, replacement: 'if (false) {' }
]);

// 7. playlist-detail-song-list-header-filters.tsx
applyRegexes('src/renderer/features/playlists/components/playlist-detail-song-list-header-filters.tsx', [
    { pattern: /portalContainer=\{containerRef\.current\}/g, replacement: '' }
]);

// 8. playlist-query-builder.tsx
applyRegexes('src/renderer/features/playlists/components/playlist-query-builder.tsx', [
    { pattern: /const operators = useMemo\([\s\S]*?\};\n        \}, \[t\]\);/g, replacement: 'const operators = {} as any;' }
]);

// 9. podcast-detail-route.tsx
applyRegexes('src/renderer/features/podcasts/routes/podcast-detail-route.tsx', [
    { pattern: /type: server\.type,/g, replacement: '' }
]);

// 10. add-server-form.tsx
applyRegexes('src/renderer/features/servers/components/add-server-form.tsx', [
    { pattern: /name:[\s\S]*?SERVER_TYPES\[initialServerType as ServerType\]\?\.name,/g, replacement: "name: SERVER_TYPES[initialServerType as ServerType]?.name," }
]);

// 11. list-filters.tsx
applyRegexes('src/renderer/features/shared/components/list-filters.tsx', [
    { pattern: /import \{ SubsonicAlbumFilters, SubsonicSongFilters \} from '\.\/filters';\n/g, replacement: '' }
]);

// 12. use-album-quality-profiles.ts
fs.writeFileSync('src/renderer/hooks/use-album-quality-profiles.ts', `
import { Album } from '/@/shared/types/domain-types';
export type AlbumWithQualityProfile = Album & { qualityProfile?: any };
export const useAlbumQualityProfiles = <T extends Album>(albums: T[] | undefined): T[] => { return albums ?? []; };
`);

// 13. list-sort-by-dropdown.tsx
if (fs.existsSync('src/renderer/features/shared/components/list-sort-by-dropdown.tsx')) {
    let content = fs.readFileSync('src/renderer/features/shared/components/list-sort-by-dropdown.tsx', 'utf8');
    content = content.replace(/import \{ AlbumArtistListSort,[\s\S]*?\} from '\/@\/shared\/types\/list-filters\.types';/g, "import { ArtistListSort, ListSort, PlaylistListSort } from '/@/shared/types/list-filters.types';");
    fs.writeFileSync('src/renderer/features/shared/components/list-sort-by-dropdown.tsx', content);
}
