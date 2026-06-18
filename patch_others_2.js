const fs = require('fs');

const filesToFix = [
    'apps/android/src/player/PlayerSurface.tsx',
    'apps/android/src/screens/HomeScreen.tsx',
];

for (const file of filesToFix) {
    let code = fs.readFileSync(file, 'utf8');
    
    code = code.replace(/serverConnections\.find/g, 'serverConnection ? [serverConnection].find : [].find'); 
    // Wait, if it's finding, maybe just fix it manually.
    // Or just `serverConnection` where `serverConnections` was used incorrectly.
    code = code.replace(/serverConnections/g, 'serverConnection');
    
    fs.writeFileSync(file, code);
}
