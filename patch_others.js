const fs = require('fs');

const filesToFix = [
    'apps/android/src/player/PlayerSurface.tsx',
    'apps/android/src/screens/HomeScreen.tsx',
    'apps/android/src/screens/DownloadsScreen.tsx',
];

for (const file of filesToFix) {
    let code = fs.readFileSync(file, 'utf8');
    
    // ArtworkImage and ArtworkZoomModal now expect serverConnection={serverConnection}
    // and props expect serverConnection: ServerAuthenticationResult | null
    code = code.replace(/serverConnections:\s*ServerAuthenticationResult\[\];/g, 'serverConnection: ServerAuthenticationResult | null;');
    code = code.replace(/serverConnections\?:\s*ServerAuthenticationResult\[\];/g, 'serverConnection?: ServerAuthenticationResult | null;');
    code = code.replace(/serverConnections,\n/g, 'serverConnection,\n');
    code = code.replace(/serverConnections=\{serverConnections\}/g, 'serverConnection={serverConnection}');
    code = code.replace(/serverConnections=\{serverConnection\}/g, 'serverConnection={serverConnection}');
    
    fs.writeFileSync(file, code);
}
