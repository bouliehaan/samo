const fs = require('fs');

let content = fs.readFileSync('apps/android/src/screens/MediaDetailScreen.tsx', 'utf8');

// 1. Import InteractionManager
if (!content.includes('InteractionManager')) {
    content = content.replace(
        "import { ActivityIndicator, Keyboard, Pressable, StyleSheet, View } from 'react-native';",
        "import { ActivityIndicator, InteractionManager, Keyboard, Pressable, StyleSheet, View } from 'react-native';"
    );
}

// 2. Add isTransitioning state
if (!content.includes('isTransitioning')) {
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

// 3. Rename displayTracks to fullDisplayTracks
if (!content.includes('const fullDisplayTracks')) {
    content = content.replace(
        /const displayTracks = useMemo\(\(\) => \{/g,
        'const fullDisplayTracks = useMemo(() => {'
    );
}

// 4. Add displayTracks logic
if (!content.includes('const displayTracks = useMemo')) {
    content = content.replace(
        /const playableDisplayTracks = useMemo\(\n        \(\) => displayTracks\.filter\(\(track\) => track\.playback\),\n        \[displayTracks\],\n    \);/m,
        `const displayTracks = useMemo(() => {
        return isTransitioning ? fullDisplayTracks.slice(0, 20) : fullDisplayTracks;
    }, [fullDisplayTracks, isTransitioning]);

    const playableDisplayTracks = useMemo(
        () => fullDisplayTracks.filter((track) => track.playback),
        [fullDisplayTracks],
    );`
    );
}

// 5. Update other usages of displayTracks that should be fullDisplayTracks
content = content.replace(/handlePlayMediaTrack\(fullDisplayTracks,/g, 'handlePlayMediaTrackStable('); // Cleanup just in case
content = content.replace(
    /const handleShuffleDetailTracks = useCallback\(\(\) => \{/g,
    `const handleShuffleDetailTracks = useCallback(() => {
        if (!fullDisplayTracks.length) return;
        const playable = fullDisplayTracks.filter(t => t.playback);`
);
content = content.replace(
    /const handlePlayMediaTrackStable = useCallback\(\n        \(track: MobileMediaTrack\) =>\n            handlePlayMediaTrack\(\n                displayTracks,\n                track,\n                onPlayTrack,\n            \),\n        \[displayTracks, onPlayTrack\],\n    \);/m,
    `const handlePlayMediaTrackStable = useCallback(
        (track: MobileMediaTrack) =>
            handlePlayMediaTrack(
                fullDisplayTracks,
                track,
                onPlayTrack,
            ),
        [fullDisplayTracks, onPlayTrack],
    );`
);

// We need to fix handleShuffleDetailTracks because it's slightly different. Let's see what it is actually.
