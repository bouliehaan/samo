const fs = require('fs');

// PlayerSurface.tsx
let player = fs.readFileSync('apps/android/src/player/PlayerSurface.tsx', 'utf8');
player = player.replace(/serverConnection\.find/g, '(() => serverConnection)()'); // or just fix it
player = player.replace(/const candidate = serverConnection\.find/g, 'const candidate = [serverConnection].find');
fs.writeFileSync('apps/android/src/player/PlayerSurface.tsx', player);

// HomeScreen.tsx
let home = fs.readFileSync('apps/android/src/screens/HomeScreen.tsx', 'utf8');
home = home.replace(/serverConnection\.length === 0/g, '!serverConnection');
home = home.replace(/serverConnection: \[\]\.find \? \[\]\.find : serverConnection,/g, 'serverConnection: serverConnection,');
fs.writeFileSync('apps/android/src/screens/HomeScreen.tsx', home);
