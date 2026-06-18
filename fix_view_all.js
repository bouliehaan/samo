const fs = require('fs');

let content = fs.readFileSync('apps/android/src/screens/ViewAllScreen.tsx', 'utf8');

// 1. Add SkeletonTile to imports
if (!content.includes('SkeletonTile')) {
    content = content.replace(
        "import { ArtworkImage } from '../components/ArtworkImage';",
        "import { ArtworkImage } from '../components/ArtworkImage';\nimport { SkeletonTile } from '../components/Skeleton';"
    );
}

// 2. Replace ActivityIndicator with a grid of 12 SkeletonTiles
content = content.replace(
    /<ActivityIndicator color=\{colors.accent\} \/>/,
    `<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16, width: '100%' }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                                <View key={i} style={{ width: '45%' }}>
                                    <SkeletonTile />
                                </View>
                            ))}
                        </View>`
);

fs.writeFileSync('apps/android/src/screens/ViewAllScreen.tsx', content);
