const fs = require('fs');
let code = fs.readFileSync('apps/android/App.tsx', 'utf8');

// Replace serverConnections: serverConnections with serverConnection: serverConnection
// And similar passes
code = code.replace(/serverConnections:\s*serverConnections/g, 'serverConnection: serverConnection');
code = code.replace(/serverConnections=\{serverConnections\}/g, 'serverConnection={serverConnection}');
code = code.replace(/serverConnections=\{serverConnection\}/g, 'serverConnection={serverConnection}');

fs.writeFileSync('apps/android/App.tsx', code);
