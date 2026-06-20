const fs = require('fs');
const files = [
    'src/remote/components/remote-container.tsx',
    'src/renderer/api/controller.ts',
    'src/renderer/features/login/routes/login-route.tsx',
    'src/renderer/features/player/hooks/use-mpris.ts',
    'src/renderer/features/playlists/components/create-playlist-form.tsx',
    'src/renderer/features/playlists/components/playlist-query-builder.tsx',
    'src/renderer/features/playlists/utils.ts',
    'src/renderer/features/servers/components/add-server-form.tsx',
    'src/renderer/features/shared/components/list-filters.tsx',
    'src/renderer/features/shared/components/list-sort-by-dropdown.tsx',
    'src/renderer/features/shared/components/tag-filter.tsx'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let lines = fs.readFileSync(file, 'utf8').split('\n');
    lines = lines.filter(line => !line.includes('ServerType.NAVIDROME') && !line.includes('ServerType.SUBSONIC') && !line.includes('NDSongQuery'));
    fs.writeFileSync(file, lines.join('\n'));
}

// Fix missing containerRef
const plFilters = 'src/renderer/features/playlists/components/playlist-detail-song-list-header-filters.tsx';
if (fs.existsSync(plFilters)) {
    let content = fs.readFileSync(plFilters, 'utf8');
    content = content.replace('portalContainer={containerRef.current}', '');
    fs.writeFileSync(plFilters, content);
}

// Fix missing quality badge profile
const profileFix = 'src/renderer/hooks/use-album-quality-profiles.ts';
if (fs.existsSync(profileFix)) {
    let content = fs.readFileSync(profileFix, 'utf8');
    content = content.replace(/.*QualityBadgeProfile.*/g, '');
    content = content.replace(/.*canScanAlbumQuality.*/g, '');
    content = content.replace(/.*annotateSubsonicAlbumsQuality.*/g, '');
    fs.writeFileSync(profileFix, content);
}

// Fix missing NO_DEVICES_AVAILABLE
const castFix = 'src/renderer/services/chromecast/desktop-cast-service.ts';
if (fs.existsSync(castFix)) {
    let content = fs.readFileSync(castFix, 'utf8');
    content = content.replace(/.*CastState\.NO_DEVICES_AVAILABLE.*/g, 'false');
    fs.writeFileSync(castFix, content);
}

// Fix missing property 'type' in ServerAuthenticationResult
const podcastDetail = 'src/renderer/features/podcasts/routes/podcast-detail-route.tsx';
if (fs.existsSync(podcastDetail)) {
    let content = fs.readFileSync(podcastDetail, 'utf8');
    content = content.replace(/type: server.type,/g, '');
    fs.writeFileSync(podcastDetail, content);
}

// Fix home-podcast-feed.tsx classNames
const homePodcast = 'src/renderer/features/home/components/home-podcast-feed.tsx';
if (fs.existsSync(homePodcast)) {
    let content = fs.readFileSync(homePodcast, 'utf8');
    content = content.replace(/className=\{/g, 'classNames={');
    fs.writeFileSync(homePodcast, content);
}

