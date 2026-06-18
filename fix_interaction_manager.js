const fs = require('fs');

let content = fs.readFileSync('apps/android/src/screens/MediaDetailScreen.tsx', 'utf8');

// Insert isTransitioning state
if (!content.includes('const [isTransitioning')) {
    content = content.replace(
        /const \[playlistManageMode, setPlaylistManageMode\] = useState\(false\);/,
        `const [playlistManageMode, setPlaylistManageMode] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(true);

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            setIsTransitioning(false);
        });
        return () => task.cancel();
    }, []);`
    );
}

// Rename the main displayTracks to fullDisplayTracks
content = content.replace(
    /const displayTracks = useMemo\(\(\) => \{/,
    'const fullDisplayTracks = useMemo(() => {'
);

// Add displayTracks definition
content = content.replace(
    /const playableDisplayTracks = useMemo\(/,
    `const displayTracks = useMemo(() => {
        return isTransitioning ? fullDisplayTracks.slice(0, 20) : fullDisplayTracks;
    }, [fullDisplayTracks, isTransitioning]);

    const playableDisplayTracks = useMemo(`
);

// We need to change playableDisplayTracks to use fullDisplayTracks
content = content.replace(
    /const playableDisplayTracks = useMemo\(\n        \(\) => displayTracks.filter\(\(track\) => track.playback\),\n        \[displayTracks\],\n    \);/g,
    `const playableDisplayTracks = useMemo(
        () => fullDisplayTracks.filter((track) => track.playback),
        [fullDisplayTracks],
    );`
);

// Change handlePlayMediaTrackStable to use fullDisplayTracks
content = content.replace(
    /handlePlayMediaTrack\(\n                displayTracks,\n                track,\n                onPlayTrack,\n            \),/g,
    `handlePlayMediaTrack(
                fullDisplayTracks,
                track,
                onPlayTrack,
            ),`
);
content = content.replace(
    /\[displayTracks, onPlayTrack\],/g,
    `[fullDisplayTracks, onPlayTrack],`
);

// Change handleShuffleDetailTracks to use fullDisplayTracks
content = content.replace(
    /if \(!displayTracks\.length\) return;\n        const playable = displayTracks\.filter\(\(t\) => t\.playback\);/g,
    `if (!fullDisplayTracks.length) return;
        const playable = fullDisplayTracks.filter((t) => t.playback);`
);

fs.writeFileSync('apps/android/src/screens/MediaDetailScreen.tsx', content);
