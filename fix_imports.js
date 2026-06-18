const fs = require('fs');
let content = fs.readFileSync('apps/android/src/screens/MediaDetailScreen.tsx', 'utf8');

if (!content.includes('InteractionManager,')) {
    content = content.replace(
        /type ImageStyle,\n    Keyboard,/,
        "type ImageStyle,\n    InteractionManager,\n    Keyboard,"
    );
}
fs.writeFileSync('apps/android/src/screens/MediaDetailScreen.tsx', content);
