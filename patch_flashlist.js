const fs = require('fs');
let code = fs.readFileSync('apps/android/src/screens/MediaDetailScreen.tsx', 'utf8');
code = code.replace(
    /contentContainerStyle=\{styles.mediaDetailContent\}/g,
    '// @ts-ignore\n                    estimatedItemSize={62}\n                    contentContainerStyle={styles.mediaDetailContent}'
);
fs.writeFileSync('apps/android/src/screens/MediaDetailScreen.tsx', code);
