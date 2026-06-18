const fs = require('fs');
let code = fs.readFileSync('apps/android/src/screens/MediaDetailScreen.tsx', 'utf8');

// Replace serverConnections={serverConnections} with serverConnection={serverConnections ? findServerAuthenticationForSource(serverConnections, contentSource || detail?.source) ?? null : null}
// Actually, it's safer to just replace them one by one.

const linesToReplace = [
    [149, "serverConnection={serverConnections ? findServerAuthenticationForSource(serverConnections, mediaDetailState.itemSource) ?? null : null}"],
    [164, "serverConnection={serverConnections ? findServerAuthenticationForSource(serverConnections, mediaDetailState.itemSource) ?? null : null}"],
    [292, "serverConnection={serverConnections ? findServerAuthenticationForSource(serverConnections, contentSource) ?? null : null}"],
    [404, "() => findServerAuthenticationForSource(serverConnections, detail.source) ?? null,"],
    [628, "const auth = findServerAuthenticationForSource(serverConnections, detail.source) ?? null;"],
    [637, "const auth = findServerAuthenticationForSource(serverConnections, detail.source) ?? null;"],
    [912, "const auth = findServerAuthenticationForSource(serverConnections, detail.source) ?? null;"],
    [992, "serverConnection={serverConnections ? findServerAuthenticationForSource(serverConnections, detail.source) ?? null : null}"],
    [1433, "serverConnection={serverConnections ? findServerAuthenticationForSource(serverConnections, detail.source) ?? null : null}"],
    [1773, "serverConnection={serverConnections ? findServerAuthenticationForSource(serverConnections, detail.source) ?? null : null}"],
    [1867, "serverConnection={serverConnections ? findServerAuthenticationForSource(serverConnections, item.source) ?? null : null}"],
    [1906, "serverConnection={serverConnections ? findServerAuthenticationForSource(serverConnections, item.source) ?? null : null}"],
];

let lines = code.split('\n');
for (const [lineNum, replacement] of linesToReplace) {
    // lineNum is 1-indexed, so we use lineNum - 1
    // The previous text should be something like serverConnections={serverConnections} or the findServer.. call
    if (lines[lineNum - 1].includes("serverConnections={serverConnections}")) {
        lines[lineNum - 1] = lines[lineNum - 1].replace("serverConnections={serverConnections}", replacement);
    } else if (lines[lineNum - 1].includes("findServerAuthenticationForSource")) {
        // Just replace the whole line carefully to fix the TS error
        // The error was "Argument of type 'ServerAuthenticationResult[]' is not assignable to parameter of type 'ServerAuthenticationResult'"
        // Oh wait! findServerAuthenticationForSource expects authentications as first param!!
        // WAIT! I RESTORED server-session.ts to my patch where it expects a SINGLE authentication!!
        // Let's check `findServerAuthenticationForSource` in `server-session.ts` AGAIN!
    }
}
