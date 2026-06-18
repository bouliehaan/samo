const fs = require('fs');
let content = fs.readFileSync('apps/android/src/components/Skeleton.tsx', 'utf8');

content = content.replace(
    /<View style=\{\[styles\.trackText, \{ gap: 6, paddingVertical: 2 \}\]\}>/g,
    '<View style={styles.trackText}>'
);

content = content.replace(
    /\{\/\* Title \*\/\}\n\s*<SkeletonBlock style=\{\{ width: '60%', height: 16 \}\} borderRadius=\{4\} \/>\n\s*\{\/\* Subtitle \*\/\}\n\s*<SkeletonBlock style=\{\{ width: '40%', height: 12 \}\} borderRadius=\{3\} \/>/g,
    `{/* Title */}
                <SkeletonBlock style={{ width: '60%', height: 16, marginBottom: 6 }} borderRadius={4} />
                {/* Subtitle */}
                <SkeletonBlock style={{ width: '40%', height: 12 }} borderRadius={3} />`
);

fs.writeFileSync('apps/android/src/components/Skeleton.tsx', content);
