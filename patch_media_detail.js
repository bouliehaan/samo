const fs = require('fs');

const path = 'apps/android/src/screens/MediaDetailScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace serverConnections arrays with serverConnection | null
content = content.replace(/serverConnections:\s*ServerAuthenticationResult\[\];/g, 'serverConnection: ServerAuthenticationResult | null;');
content = content.replace(/serverConnections\?:\s*ServerAuthenticationResult\[\];/g, 'serverConnection?: ServerAuthenticationResult | null;');
content = content.replace(/serverConnections,\n/g, 'serverConnection,\n');
content = content.replace(/serverConnections={serverConnections}/g, 'serverConnection={serverConnection}');

// Fix the findServerAuthenticationForSource calls:
// They expect `ServerAuthenticationResult | null` as the first argument, not an array.
// But we renamed the variable to `serverConnection`.
content = content.replace(/findServerAuthenticationForSource\(serverConnections,\s*detail\.source\)/g, 'findServerAuthenticationForSource(serverConnection, detail.source)');
content = content.replace(/findServerAuthenticationForSource\(serverConnections,\s*item\.source\)/g, 'findServerAuthenticationForSource(serverConnection, item.source)');
content = content.replace(/findServerAuthenticationForSource\(serverConnections,\s*contentSource\)/g, 'findServerAuthenticationForSource(serverConnection, contentSource)');

// `enqueueCollectionDownload` expects `ServerAuthenticationResult | null` if the rest of the app was migrated
content = content.replace(/enqueueCollectionDownload\(detail, serverConnections\)/g, 'enqueueCollectionDownload(detail, serverConnection)');

// In useEffects, replace dependencies on serverConnections with serverConnection
content = content.replace(/\[detail\.source,\s*serverConnections\]/g, '[detail.source, serverConnection]');

fs.writeFileSync(path, content);
