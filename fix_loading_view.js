const fs = require('fs');

let content = fs.readFileSync('apps/android/src/screens/MediaDetailScreen.tsx', 'utf8');

// 1. Add SkeletonTrackRow to imports
if (!content.includes('SkeletonTrackRow')) {
    content = content.replace(
        "import { ArtworkImage } from '../components/ArtworkImage';",
        "import { ArtworkImage } from '../components/ArtworkImage';\nimport { SkeletonTrackRow } from '../components/Skeleton';"
    );
}

// 2. Replace ActivityIndicator with 8 SkeletonTrackRows in MediaDetailLoadingView
content = content.replace(
    /<ActivityIndicator color=\{colors.accent\} style=\{\{ marginTop: spacing.lg \}\} \/>/,
    `<View style={{ marginTop: spacing.md, marginHorizontal: spacing.md, paddingBottom: 100 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <SkeletonTrackRow key={i} />
                    ))}
                </View>`
);

fs.writeFileSync('apps/android/src/screens/MediaDetailScreen.tsx', content);
