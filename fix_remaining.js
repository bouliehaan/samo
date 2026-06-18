const fs = require('fs');

let player = fs.readFileSync('apps/android/src/player/PlayerSurface.tsx', 'utf8');
player = player.replace(
    /const auth = sourceId\s*\n\s*\?\s*serverConnection\s*\?\s*\[serverConnection\]\.find\s*:\s*\[\]\.find\(\s*\n\s*\(candidate\) => getPersistedServerAuthKey\(candidate\) === sourceId,\s*\n\s*\)\s*\n\s*: undefined;/m,
    `const auth = sourceId && serverConnection && getPersistedServerAuthKey(serverConnection) === sourceId ? serverConnection : undefined;`
);
fs.writeFileSync('apps/android/src/player/PlayerSurface.tsx', player);

let home = fs.readFileSync('apps/android/src/screens/HomeScreen.tsx', 'utf8');
home = home.replace(
    /serverConnection: serverConnection,/g,
    'serverConnection: serverConnection ?? null,'
);
fs.writeFileSync('apps/android/src/screens/HomeScreen.tsx', home);
