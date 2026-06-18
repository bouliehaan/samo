sed -i '' 's/const playableDisplayTracks = useMemo(/console.time("displayTracks_useMemo");\n    const playableDisplayTracks = useMemo(/g' apps/android/src/screens/MediaDetailScreen.tsx
sed -i '' 's/        \[displayTracks\],/        [displayTracks],\n    );\n    console.timeEnd("displayTracks_useMemo");/g' apps/android/src/screens/MediaDetailScreen.tsx
