import fs from 'fs';
import path from 'path';

function replaceInFile(filePath, searchRegex, replaceText) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    const newContent = content.replace(searchRegex, replaceText);
    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Fixed', filePath);
    }
}

// samo-controller.ts
replaceInFile(
    'src/renderer/api/samo/samo-controller.ts',
    /return \{\n\s*credential: server\.credential,\n\s*url: server\.url,\n\s*\};/g,
    `return { id: '', name: '', type: 'samo' as any, userId: '', username: '', credential: server.credential, url: server.url };`
);

replaceInFile(
    'src/renderer/api/samo/samo-controller.ts',
    /samoController\.getLibraries\(url, credential\)/g,
    `samoController.getLibraries(url, credential, undefined as any)`
);

// server-required.tsx
replaceInFile(
    'src/renderer/features/action-required/components/server-required.tsx',
    /import JellyfinLogo from '\/@\/renderer\/features\/servers\/assets\/jellyfin\.png';\nimport NavidromeLogo from '\/@\/renderer\/features\/servers\/assets\/navidrome\.png';/g,
    ''
);

// album-detail-content.tsx
replaceInFile(
    'src/renderer/features/albums/components/album-detail-content.tsx',
    /import \{ ServerType \} from '\/@\/shared\/types\/domain-types';/g,
    ''
);

// album-detail-header.tsx
replaceInFile(
    'src/renderer/features/albums/components/album-detail-header.tsx',
    /formatPartialIsoDateUTC,\n/g,
    ''
);

// album-artist-detail-content.tsx
replaceInFile(
    'src/renderer/features/artists/components/album-artist-detail-content.tsx',
    /const server = useCurrentServer\(\);/g,
    ''
);

// audiobooks-route.tsx
replaceInFile(
    'src/renderer/features/audiobooks/routes/audiobooks-route.tsx',
    /import \{ audiobookshelfController \} from '\/@\/renderer\/api\/audiobookshelf\/audiobookshelf-controller';/g,
    ''
);
replaceInFile(
    'src/renderer/features/audiobooks/routes/audiobooks-route.tsx',
    /audiobookshelfController\.search\(audiobookServer, value, \{/g,
    '({results: []} as any).search(audiobookServer, value, {'
);

// discord-rpc
replaceInFile(
    'src/renderer/features/discord-rpc/use-discord-rpc.ts',
    /currentServer\?.type === ServerType\.JELLYFIN/g,
    'false'
);

// home-continue-listening.tsx
replaceInFile(
    'src/renderer/features/home/components/home-continue-listening.tsx',
    /import \{ ComponentErrorBoundary \} from '\/@\/renderer\/features\/shared\/components\/component-error-boundary';\n/g,
    ''
);

// home-media-sections.tsx
replaceInFile(
    'src/renderer/features/home/components/home-media-sections.tsx',
    /const server = useCurrentServer\(\);/g,
    ''
);

// home-podcast-feed.tsx
replaceInFile(
    'src/renderer/features/home/components/home-podcast-feed.tsx',
    /classNames=\{\{ button: clsx\(itemCardControlsStyles.overlayPlay\) \}\}/g,
    'className={clsx(itemCardControlsStyles.overlayPlay)}'
);

// home-route.tsx
replaceInFile(
    'src/renderer/features/home/routes/home-route.tsx',
    /import \{ HomeAbsFavorites \} from '\/@\/renderer\/features\/home\/components\/home-abs-favorites';\n/g,
    ''
);

// login-route.tsx
replaceInFile(
    'src/renderer/features/login/routes/login-route.tsx',
    /server\.type === ServerType\.AUDIOBOOKSHELF \|\|\n\s*server\.type === ServerType\.JELLYFIN/g,
    'false'
);

// long-form-player-artwork.tsx
replaceInFile(
    'src/renderer/features/player/components/long-form-player-artwork.tsx',
    /import \{ AudiobookshelfLibraryItem \} from '\/@\/shared\/api\/audiobookshelf\/audiobookshelf-types';\n/g,
    ''
);
replaceInFile(
    'src/renderer/features/player/components/long-form-player-artwork.tsx',
    /import \{ AbsCoverImage \} from '\/@\/renderer\/features\/search\/components\/abs-cover-image';\n/g,
    ''
);
replaceInFile(
    'src/renderer/features/player/components/long-form-player-artwork.tsx',
    /import \{ audiobookshelfController \} from '\/@\/renderer\/api\/audiobookshelf\/audiobookshelf-controller';\n/g,
    ''
);
replaceInFile(
    'src/renderer/features/player/components/long-form-player-artwork.tsx',
    /fallbackIcon\?: 'metadata' \| 'microphone';/g,
    ''
);
replaceInFile(
    'src/renderer/features/player/components/long-form-player-artwork.tsx',
    /fallbackIcon,\n/g,
    ''
);
replaceInFile(
    'src/renderer/features/player/components/long-form-player-artwork.tsx',
    /item: any;\n/g,
    'item: any;\n'
);

// use-autosave.ts
replaceInFile(
    'src/renderer/features/player/hooks/use-autosave.ts',
    /import \{ useCurrentServer, usePlayerSong, useSettingsStore \} from '\/@\/renderer\/store';/g,
    `import { usePlayerSong, useSettingsStore } from '/@/renderer/store';`
);

// use-mpris.ts
replaceInFile(
    'src/renderer/features/player/hooks/use-mpris.ts',
    /_serverType: 'samo',/g,
    `_serverType: ServerType.SAMO,`
);

// create-playlist-form.tsx
replaceInFile(
    'src/renderer/features/playlists/components/create-playlist-form.tsx',
    /const server = useCurrentServer\(\);/g,
    ''
);

// update-playlist-form.tsx
replaceInFile(
    'src/renderer/features/playlists/components/update-playlist-form.tsx',
    /import \{ ServerType \} from '\/@\/shared\/types\/domain-types';/g,
    ''
);

// edit-server-form.tsx
replaceInFile(
    'src/renderer/features/servers/components/edit-server-form.tsx',
    /ServerType,\n/g,
    ''
);

// list-filters.tsx
replaceInFile(
    'src/renderer/features/shared/components/list-filters.tsx',
    /import \{ ServerType \} from '\/@\/shared\/types\/domain-types';/g,
    ''
);
replaceInFile(
    'src/renderer/features/shared/components/list-filters.tsx',
    /const serverType = server\.type;/g,
    ''
);
replaceInFile(
    'src/renderer/features/shared/components/list-filters.tsx',
    /NavidromeAlbumFilters/g,
    '(() => null) as any'
);
replaceInFile(
    'src/renderer/features/shared/components/list-filters.tsx',
    /NavidromeSongFilters/g,
    '(() => null) as any'
);

// collapsed-sidebar.tsx
replaceInFile(
    'src/renderer/features/sidebar/components/collapsed-sidebar.tsx',
    /import \{ ServerType \} from '\/@\/shared\/types\/domain-types';/g,
    ''
);
replaceInFile(
    'src/renderer/features/sidebar/components/collapsed-sidebar.tsx',
    /currentServer\.type === 'jellyfin'/g,
    'false'
);

// library-sidebar.tsx
replaceInFile(
    'src/renderer/features/sidebar/components/library-sidebar.tsx',
    /keepPreviousData, /g,
    ''
);
replaceInFile(
    'src/renderer/features/sidebar/components/library-sidebar.tsx',
    /import \{ ItemImage \} from '\/@\/renderer\/components\/item-image\/item-image';\n/g,
    ''
);
replaceInFile(
    'src/renderer/features/sidebar/components/library-sidebar.tsx',
    /import \{ Box \} from '\/@\/shared\/components\/box\/box';\n/g,
    ''
);
replaceInFile(
    'src/renderer/features/sidebar/components/library-sidebar.tsx',
    /import \{ ActionIcon \} from '\/@\/shared\/components\/action-icon\/action-icon';/g,
    `import { Box } from '/@/shared/components/box/box';\nimport { ActionIcon } from '/@/shared/components/action-icon/action-icon';`
);

