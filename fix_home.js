const fs = require('fs');

let home = fs.readFileSync('apps/android/src/screens/HomeScreen.tsx', 'utf8');
home = home.replace(/serverConnection=\{serverConnection \?\? \[\]\}/g, 'serverConnection={serverConnection ?? null}');
fs.writeFileSync('apps/android/src/screens/HomeScreen.tsx', home);
